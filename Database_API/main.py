import os
import time

import bcrypt
import dotenv
import jwt
import mysql.connector
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import errorcode
from pydantic import BaseModel

dotenv.load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    cnx = mysql.connector.connect(
        user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
        host=os.environ["MYSQL_HOST"],
        database=os.environ["MYSQL_DB"],
    )
    cursor = cnx.cursor()
except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Not a valid username or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
    else:
        print(err)

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


class RegisterRequest(BaseModel):
    voter_id: str
    password: str
    email: str


class LoginRequest(BaseModel):
    voter_id: str
    password: str


@app.post("/register")
async def register(request: RegisterRequest):
    try:
        cursor.execute(
            "SELECT voter_id FROM voters WHERE voter_id = %s", (request.voter_id,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user already registered pls login",
            )

        password_hash = _hash_password(request.password)
        cursor.execute(
            "INSERT INTO voters (voter_id, password, role) VALUES (%s, %s, %s)",
            (request.voter_id, password_hash, "user"),
        )
        cnx.commit()

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
    try:
        cursor.execute(
            "SELECT password, role FROM voters WHERE voter_id = %s",
            (request.voter_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise LOGIN_FAILED

        stored_password, role = row
        if not _verify_and_maybe_upgrade_password(
            request.voter_id, request.password, stored_password
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
            os.environ["SECRET_KEY"],
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
