import os
import time
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

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_and_maybe_upgrade_password(voter_id: str, plain: str, stored: str) -> bool:
    """Return True if password matches. Upgrades legacy plaintext rows to bcrypt."""
    if stored.startswith("$2"):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except ValueError:
            return False
    if stored == plain:
        new_hash = _hash_password(plain)
        cursor.execute(
            "UPDATE voters SET password = %s WHERE voter_id = %s",
            (new_hash, voter_id),
        )
        cnx.commit()
        return True
    return False

def _require_database():
    if cnx is None or cursor is None:
        detail = "Database is unavailable for authentication."
        if db_unavailable_reason:
            detail = f"{detail} {db_unavailable_reason}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
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


class RegisterRequest(BaseModel):
    voter_id: str
    password: str
    email: str


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
    try:
        db_cursor.execute(
            "SELECT voter_id FROM voters WHERE voter_id = %s", (request.voter_id,)
        )
        if db_cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user already registered pls login",
            )

        password_hash = _hash_password(request.password)
        db_cursor.execute(
            "INSERT INTO voters (voter_id, password, role) VALUES (%s, %s, %s)",
            (request.voter_id, password_hash, "user"),
        )
        db_connection.commit()

        return {"message": "User registered successfully"}
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error"
        )


@app.post("/login")
async def login(request: LoginRequest):
    db_connection, db_cursor = _require_database()
    try:
        db_cursor.execute(
            "SELECT password, role FROM voters WHERE voter_id = %s",
            (request.voter_id,),
        )
        row = db_cursor.fetchone()
        if not row:
            raise LOGIN_FAILED

        stored_password, role = row
        if not _verify_and_maybe_upgrade_password(
            db_cursor, db_connection, request.voter_id, request.password, stored_password
        ):
            raise LOGIN_FAILED

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
