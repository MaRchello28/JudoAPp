"""Modele danych API (wejście i wyjście) z walidacją."""
from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Email = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=EMAIL_PATTERN, max_length=254)]


# ---------- Konto ----------
class RegisterIn(BaseModel):
    email: Email
    password: str = Field(min_length=8, max_length=72)
    first_name: Name
    last_name: Name
    birth_date: date

    @field_validator("birth_date")
    @classmethod
    def _birth_date(cls, v: date) -> date:
        if v < date(1900, 1, 1) or v > date.today():
            raise ValueError("Data urodzenia jest nieprawidłowa.")
        return v


class LoginIn(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=72)


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    email: str | None = None
    first_name: str = ""
    last_name: str = ""
    birth_date: str = ""


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int | None = None
    user: UserOut


class RegisterOut(BaseModel):
    needs_confirmation: bool
    session: SessionOut | None = None


# ---------- Ćwiczenia ----------
class ExerciseIn(BaseModel):
    name: Title
    category: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)] = "Inne"


class ExerciseOut(BaseModel):
    id: UUID
    name: str
    category: str
    own: bool


# ---------- Plany treningu motorycznego ----------
class SetData(BaseModel):
    reps: int | None = Field(default=None, ge=0, le=10000)
    weight: float | None = Field(default=None, ge=0, le=99999.99)


class PlanRowIn(BaseModel):
    exercise_id: UUID | None = None
    sets: list[SetData]


class PlanIn(BaseModel):
    name: Title
    date: date
    series: int = Field(ge=1, le=8)
    rows: list[PlanRowIn] = Field(min_length=1, max_length=15)

    @model_validator(mode="after")
    def _sets_match_series(self):
        if any(len(r.sets) != self.series for r in self.rows):
            raise ValueError("Każde ćwiczenie musi mieć dokładnie tyle serii, ile ustawiono w planie.")
        return self


class PlanRowOut(BaseModel):
    exercise_id: UUID | None = None
    exercise_name: str | None = None
    sets: list[SetData]


class PlanOut(BaseModel):
    id: UUID
    name: str
    date: date
    series: int
    rows: list[PlanRowOut]
