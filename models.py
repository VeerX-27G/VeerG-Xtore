# SQLAlchemy is an ORM (Object-Relational Mapper) that allows you to interact with your database using Python objects instead of SQL.
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, index=True)

    description = Column(String, index=True)

    price = Column(Float, index=True)

    stock = Column(Integer, index=True)

    img = Column(String, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(Integer, primary_key=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    items_json = Column(Text, nullable=False)
    subtotal = Column(Float, nullable=False)
    shipping = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    ship_to = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Confirmed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
