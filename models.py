from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

@dataclass
class Employee:
    """Employee data model"""
    first_name: str
    last_name: str
    email: str
    contact: str
    designation: str
    salary: Decimal
    id: Optional[int] = None
    
    def __post_init__(self):
        # Ensure salary is a Decimal for precise calculations
        if not isinstance(self.salary, Decimal):
            self.salary = Decimal(str(self.salary))
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        """Convert employee to dictionary"""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'contact': self.contact,
            'designation': self.designation,
            'salary': float(self.salary)
        }
