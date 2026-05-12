import hashlib
import hmac
import os
import re
import secrets
import smtplib
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path

import bcrypt
import dotenv
import jwt
import mysql.connector
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import errorcode
from pydantic import BaseModel

dotenv.load_dotenv()
dotenv.load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = FastAPI()

# CORS origins - add your Vercel URL here
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Add your Vercel URL after deployment:
    # "https://your-app.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cnx = None
cursor = None
db_unavailable_reason = None
schema_initialized = False

mysql_user = os.getenv("MYSQL_USER")
mysql_password = os.getenv("MYSQL_PASSWORD")
mysql_host = os.getenv("MYSQL_HOST")
mysql_db = os.getenv("MYSQL_DB")

missing_vars = [
    key
    for key, value in {
        "MYSQL_USER": mysql_user,
        "MYSQL_PASSWORD": mysql_password,
        "MYSQL_HOST": mysql_host,
        "MYSQL_DB": mysql_db,
    }.items()
    if not value
]

if missing_vars:
    db_unavailable_reason = f"Missing environment variables: {', '.join(missing_vars)}"
else:
    try:
        cnx = mysql.connector.connect(
            user=mysql_user,
            password=mysql_password,
            host=mysql_host,
            database=mysql_db,
        )
        cursor = cnx.cursor()
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            db_unavailable_reason = "Not a valid MySQL username or password"
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            db_unavailable_reason = "MySQL database does not exist"
        else:
            db_unavailable_reason = str(err)
        print(db_unavailable_reason)

LOGIN_FAILED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid voter id or password",
)

NITS_EMAIL_PATTERN = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9-]+\.nits\.ac\.in$", re.IGNORECASE)
VOTER_ID_PATTERN = re.compile(r"^\d{7}$")
OTP_PATTERN = re.compile(r"^\d{6}$")


def _normalize_voter_id(voter_id: str) -> str:
    return str(voter_id or "").strip()


def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def _validate_registration_input(voter_id: str, email: str, password: str):
    if not VOTER_ID_PATTERN.match(voter_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voter ID must be a 7-digit scholar ID.",
        )
    if not NITS_EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must match NIT Silchar format like rajk_ug_22@cse.nits.ac.in",
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

def _require_database():
    global schema_initialized
    if cnx is None or cursor is None:
        detail = "Database is unavailable for authentication."
        if db_unavailable_reason:
            detail = f"{detail} {db_unavailable_reason}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    if not schema_initialized:
        _ensure_auth_schema(cnx, cursor)
        schema_initialized = True
    return cnx, cursor


def _secret_key() -> str:
    key = os.getenv("SECRET_KEY")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SECRET_KEY is not configured.",
        )
    return key


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_and_maybe_upgrade_password(
    db_cursor, db_connection, voter_id: str, plain: str, stored: str
) -> bool:
    """Return True if password matches. Upgrades legacy plaintext rows to bcrypt."""
    if stored.startswith("$2"):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except ValueError:
            return False
    if stored == plain:
        new_hash = _hash_password(plain)
        db_cursor.execute(
            "UPDATE voters SET password = %s WHERE voter_id = %s",
            (new_hash, voter_id),
        )
        db_connection.commit()
        return True
    return False


def _execute_schema_change(db_cursor, sql: str):
    try:
        db_cursor.execute(sql)
    except mysql.connector.Error as err:
        ignorable = {
            errorcode.ER_DUP_FIELDNAME,
            errorcode.ER_DUP_KEYNAME,
            errorcode.ER_TABLE_EXISTS_ERROR,
        }
        if err.errno not in ignorable:
            if err.errno == errorcode.ER_DUP_ENTRY:
                return
            raise


def _ensure_auth_schema(db_connection, db_cursor):
    _execute_schema_change(
        db_cursor, "ALTER TABLE voters ADD COLUMN email VARCHAR(255) NULL"
    )
    _execute_schema_change(
        db_cursor,
        "ALTER TABLE voters ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1",
    )
    _execute_schema_change(
        db_cursor, "CREATE UNIQUE INDEX uq_voters_email ON voters (email)"
    )
    _execute_schema_change(
        db_cursor, "CREATE UNIQUE INDEX uq_voters_voter_id ON voters (voter_id)"
    )
    db_cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS registration_otps (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            voter_id VARCHAR(32) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            otp_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            attempts_remaining INT NOT NULL DEFAULT 5,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_registration_otps_voter_id (voter_id),
            UNIQUE KEY uq_registration_otps_email (email)
        )
        """
    )
    db_connection.commit()


def _smtp_settings():
    raw_host = str(os.getenv("SMTP_HOST") or "").strip()
    host_aliases = {
        "smtp.google.com": "smtp.gmail.com",
        "smtp.googlemail.com": "smtp.gmail.com",
    }
    host = host_aliases.get(raw_host.lower(), raw_host)

    raw_port = str(os.getenv("SMTP_PORT", "587")).strip()
    try:
        port = int(raw_port)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMTP_PORT is invalid. Set it to a valid port number like 587.",
        )
    if port < 1 or port > 65535:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMTP_PORT is invalid. Use a value between 1 and 65535.",
        )

    user = str(os.getenv("SMTP_USER") or "").strip() or None
    password = str(os.getenv("SMTP_PASSWORD") or "").strip() or None
    sender = str(os.getenv("SMTP_FROM") or "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true"
    use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() == "true"

    if not host:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "SMTP is not configured. Set SMTP_HOST to enable OTP verification."
            ),
        )
    if (user and not password) or (password and not user):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMTP authentication requires both SMTP_USER and SMTP_PASSWORD.",
        )
    if use_tls and use_ssl:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set either SMTP_USE_TLS or SMTP_USE_SSL, not both.",
        )
    if port == 465 and not use_tls and not use_ssl:
        use_ssl = True

    normalized_host = host.lower()
    if normalized_host == "smtp.gmail.com" and user and "@" not in user:
        if sender and "@" in sender:
            user = sender
        else:
            user = f"{user}@gmail.com"
    if not sender and user and "@" in user:
        sender = user
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "SMTP is not configured. Set SMTP_FROM "
                "(or set SMTP_USER to a full email address)."
            ),
        )
    return host, port, user, password, sender, use_tls, use_ssl


def _send_otp_email(recipient: str, otp: str):
    host, port, user, password, sender, use_tls, use_ssl = _smtp_settings()
    msg = EmailMessage()
    msg["Subject"] = "NIT Silchar Voting: Email Verification OTP"
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content(
        f"Your OTP for NIT Silchar voting registration is: {otp}\n"
        "It expires in 10 minutes.\n"
        "If you did not request this, ignore this email."
    )
    try:
        smtp_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_cls(host=host, port=port, timeout=20) as server:
            if not use_ssl and use_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to send OTP email: SMTP authentication failed. "
                "For Gmail, enable 2-Step Verification and use an App Password. "
                "Also ensure SMTP_USER matches the Gmail address."
            ),
        )
    except (smtplib.SMTPException, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to send OTP email: {exc}",
        )


def _otp_ttl_seconds() -> int:
    raw = os.getenv("OTP_TTL_SECONDS", "600").strip()
    try:
        ttl = int(raw)
    except ValueError:
        ttl = 600
    return max(120, min(ttl, 1800))


def _hash_otp(otp: str) -> str:
    payload = f"{otp}:{_secret_key()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cleanup_expired_otps(db_cursor):
    db_cursor.execute(
        "DELETE FROM registration_otps WHERE expires_at < %s OR attempts_remaining <= 0",
        (datetime.utcnow(),),
    )


class RegisterRequest(BaseModel):
    voter_id: str
    password: str
    email: str


class VerifyOtpRequest(BaseModel):
    voter_id: str
    email: str
    otp: str


class LoginRequest(BaseModel):
    voter_id: str
    password: str


@app.get("/healthz")
async def health():
    if db_unavailable_reason:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=db_unavailable_reason
        )
    return {"ok": True}


@app.post("/register")
async def register(request: RegisterRequest):
    db_connection, db_cursor = _require_database()
    voter_id = _normalize_voter_id(request.voter_id)
    email = _normalize_email(request.email)
    _validate_registration_input(voter_id, email, request.password)
    try:
        _cleanup_expired_otps(db_cursor)
        db_cursor.execute(
            "SELECT voter_id, email FROM voters WHERE voter_id = %s OR email = %s",
            (voter_id, email),
        )
        existing_voter = db_cursor.fetchone()
        if existing_voter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This voter ID or institute email is already registered. Please login.",
            )

        db_cursor.execute(
            "SELECT voter_id, email FROM registration_otps WHERE voter_id = %s OR email = %s",
            (voter_id, email),
        )
        pending = db_cursor.fetchone()
        if pending:
            pending_voter_id, pending_email = pending
            if pending_voter_id == voter_id and pending_email != email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This voter ID is already linked with another institute email.",
                )
            if pending_email == email and pending_voter_id != voter_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This institute email is already linked with another voter ID.",
                )
            db_cursor.execute(
                "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
                (voter_id, email),
            )

        otp = f"{secrets.randbelow(10**6):06d}"
        password_hash = _hash_password(request.password)
        db_cursor.execute(
            """
            INSERT INTO registration_otps
            (voter_id, email, password_hash, otp_hash, expires_at, attempts_remaining)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                voter_id,
                email,
                password_hash,
                _hash_otp(otp),
                datetime.utcnow() + timedelta(seconds=_otp_ttl_seconds()),
                5,
            ),
        )
        db_connection.commit()
        try:
            _send_otp_email(email, otp)
        except HTTPException:
            db_cursor.execute(
                "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
                (voter_id, email),
            )
            db_connection.commit()
            raise
        return {
            "message": "OTP sent to your institute email. Verify OTP to complete registration."
        }
    except HTTPException:
        db_connection.rollback()
        raise
    except mysql.connector.Error as err:
        print(err)
        db_connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error"
        )


@app.post("/register/verify")
async def verify_register_otp(request: VerifyOtpRequest):
    db_connection, db_cursor = _require_database()
    voter_id = _normalize_voter_id(request.voter_id)
    email = _normalize_email(request.email)
    otp = str(request.otp or "").strip()
    try:
        if not VOTER_ID_PATTERN.match(voter_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter ID must be a 7-digit scholar ID.",
            )
        if not NITS_EMAIL_PATTERN.match(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email must match NIT Silchar format like rajk_ug_22@cse.nits.ac.in",
            )
        if not OTP_PATTERN.match(otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP must be a 6-digit code.",
            )

        _cleanup_expired_otps(db_cursor)
        db_cursor.execute(
            """
            SELECT password_hash, otp_hash, expires_at, attempts_remaining
            FROM registration_otps
            WHERE voter_id = %s AND email = %s
            """,
            (voter_id, email),
        )
        row = db_cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending OTP registration found for this voter ID and email.",
            )

        password_hash, otp_hash, expires_at, attempts_remaining = row
        if datetime.utcnow() > expires_at:
            db_cursor.execute(
                "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
                (voter_id, email),
            )
            db_connection.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired. Please request a new OTP.",
            )

        if not hmac.compare_digest(_hash_otp(otp), otp_hash):
            remaining = max(int(attempts_remaining) - 1, 0)
            if remaining == 0:
                db_cursor.execute(
                    "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
                    (voter_id, email),
                )
            else:
                db_cursor.execute(
                    """
                    UPDATE registration_otps
                    SET attempts_remaining = %s
                    WHERE voter_id = %s AND email = %s
                    """,
                    (remaining, voter_id, email),
                )
            db_connection.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining} attempts remaining.",
            )

        db_cursor.execute(
            "SELECT voter_id FROM voters WHERE voter_id = %s OR email = %s",
            (voter_id, email),
        )
        if db_cursor.fetchone():
            db_cursor.execute(
                "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
                (voter_id, email),
            )
            db_connection.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This voter ID or institute email is already registered.",
            )

        db_cursor.execute(
            """
            INSERT INTO voters (voter_id, password, role, email, email_verified)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (voter_id, password_hash, "user", email, 1),
        )
        db_cursor.execute(
            "DELETE FROM registration_otps WHERE voter_id = %s AND email = %s",
            (voter_id, email),
        )
        db_connection.commit()
        return {"message": "Registration complete. Email verified successfully."}
    except HTTPException:
        db_connection.rollback()
        raise
    except mysql.connector.Error as err:
        print(err)
        db_connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error"
        )


@app.post("/login")
async def login(request: LoginRequest):
    db_connection, db_cursor = _require_database()
    try:
        db_cursor.execute(
            "SELECT password, role, email_verified FROM voters WHERE voter_id = %s",
            (request.voter_id,),
        )
        row = db_cursor.fetchone()
        if not row:
            raise LOGIN_FAILED

        stored_password, role, email_verified = row
        if not _verify_and_maybe_upgrade_password(
            db_cursor, db_connection, request.voter_id, request.password, stored_password
        ):
            raise LOGIN_FAILED
        if role == "user" and not bool(email_verified):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email is not verified. Please complete OTP verification.",
            )

        now = int(time.time())
        payload = {
            "sub": request.voter_id,
            "role": role,
            "iat": now,
            "exp": now + 86400,
        }
        token = jwt.encode(
            payload,
            _secret_key(),
            algorithm="HS256",
        )
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return {"token": token, "role": role}
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error"
        )
