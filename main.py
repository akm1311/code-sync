#!/usr/bin/env python3
"""
Employee Data Management System
A console application for managing employee data with SQLite database operations
"""

import sys
from decimal import Decimal
from database import DatabaseConnection
from employee_manager import EmployeeManager

def print_header():
    """Print application header"""
    print("\n" + "=" * 60)
    print(" " * 15 + "EMPLOYEE DATA MANAGEMENT SYSTEM")
    print("=" * 60)

def print_section_header(title):
    """Print section header"""
    print(f"\n{'-' * 60}")
    print(f" {title}")
    print(f"{'-' * 60}")

def print_menu():
    """Print main menu options"""
    print("\n" + "=" * 40)
    print("           MAIN MENU")
    print("=" * 40)
    print("1. Register New Employee")
    print("2. View All Employees")
    print("3. View Employees by Designation")
    print("4. Update Employee Details")
    print("5. Delete Employee")
    print("6. Update Salaries by Designation")
    print("7. Insert Demo Data")
    print("8. Employee Summary Statistics")
    print("9. Exit")
    print("=" * 40)

def get_user_choice():
    """Get and validate user menu choice"""
    while True:
        try:
            choice = input("\nEnter your choice (1-9): ").strip()
            if choice in ['1', '2', '3', '4', '5', '6', '7', '8', '9']:
                return choice
            else:
                print("Invalid choice! Please enter a number between 1-9.")
        except KeyboardInterrupt:
            print("\n\nExiting application...")
            sys.exit(0)

def handle_salary_updates(employee_manager):
    """Handle salary update operations"""
    print("\n" + "=" * 40)
    print("     SALARY UPDATE OPTIONS")
    print("=" * 40)
    print("1. Add fixed amount to designation")
    print("2. Add percentage increase to designation")
    print("3. Back to main menu")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == '3':
        return
    elif choice in ['1', '2']:
        # Get all unique designations
        all_employees = employee_manager.get_all_employees()
        if not all_employees:
            print("No employees found!")
            return
            
        designations = list(set(emp['designation'] for emp in all_employees))
        
        print("\nAvailable Designations:")
        for i, designation in enumerate(designations, 1):
            count = len([emp for emp in all_employees if emp['designation'] == designation])
            print(f"{i}. {designation} ({count} employees)")
            
        try:
            des_choice = int(input("\nSelect designation: ")) - 1
            if 0 <= des_choice < len(designations):
                selected_designation = designations[des_choice]
                
                # Show current employees
                current_employees = employee_manager.get_employees_by_designation(selected_designation)
                employee_manager.display_employees_table(current_employees, f"{selected_designation} Employees - Before Update")
                
                if choice == '1':  # Fixed amount
                    amount = float(input(f"\nEnter amount to add (₹): "))
                    updated_count = employee_manager.update_salary_by_designation(selected_designation, Decimal(str(amount)), False)
                    print(f"\nUpdated salaries for {updated_count} {selected_designation} employees (added ₹{amount:,.2f})")
                else:  # Percentage
                    percentage = float(input(f"\nEnter percentage to add (%): "))
                    updated_count = employee_manager.update_salary_by_designation(selected_designation, Decimal(str(percentage)), True)
                    print(f"\nUpdated salaries for {updated_count} {selected_designation} employees (added {percentage}%)")
                
                # Show updated employees
                if updated_count > 0:
                    updated_employees = employee_manager.get_employees_by_designation(selected_designation)
                    employee_manager.display_employees_table(updated_employees, f"{selected_designation} Employees - After Update")
                    
            else:
                print("Invalid designation choice!")
        except ValueError:
            print("Invalid input!")
    else:
        print("Invalid choice!")

def handle_view_by_designation(employee_manager):
    """Handle viewing employees by designation"""
    all_employees = employee_manager.get_all_employees()
    if not all_employees:
        print("No employees found!")
        return
        
    designations = list(set(emp['designation'] for emp in all_employees))
    
    print("\nAvailable Designations:")
    for i, designation in enumerate(designations, 1):
        count = len([emp for emp in all_employees if emp['designation'] == designation])
        print(f"{i}. {designation} ({count} employees)")
        
    try:
        choice = int(input("\nSelect designation to view: ")) - 1
        if 0 <= choice < len(designations):
            selected_designation = designations[choice]
            employees = employee_manager.get_employees_by_designation(selected_designation)
            employee_manager.display_employees_table(employees, f"{selected_designation} Employees")
        else:
            print("Invalid choice!")
    except ValueError:
        print("Invalid input!")

def handle_update_employee(employee_manager):
    """Handle updating employee details"""
    try:
        emp_id = int(input("\nEnter Employee ID to update: "))
        employee_manager.update_employee_details(emp_id)
    except ValueError:
        print("Invalid Employee ID!")

def handle_delete_employee(employee_manager):
    """Handle deleting an employee"""
    try:
        emp_id = int(input("\nEnter Employee ID to delete: "))
        employee_manager.delete_employee(emp_id)
    except ValueError:
        print("Invalid Employee ID!")

def show_statistics(employee_manager):
    """Show employee statistics"""
    employees = employee_manager.get_all_employees()
    if not employees:
        print("No employees found!")
        return
        
    print_section_header("EMPLOYEE SUMMARY STATISTICS")
    
    designations = {}
    total_salary = Decimal("0")
    
    for emp in employees:
        designation = emp['designation']
        salary = Decimal(str(emp['salary']))
        
        if designation not in designations:
            designations[designation] = {'count': 0, 'total_salary': Decimal("0")}
        
        designations[designation]['count'] += 1
        designations[designation]['total_salary'] += salary
        total_salary += salary
    
    print(f"\nTotal Employees: {len(employees)}")
    print(f"Total Salary Expense: ₹{total_salary:,.2f}")
    print("\nBreakdown by Designation:")
    
    for designation, data in designations.items():
        avg_salary = data['total_salary'] / data['count']
        print(f"  {designation}: {data['count']} employees, "
              f"Total: ₹{data['total_salary']:,.2f}, "
              f"Average: ₹{avg_salary:,.2f}")

def main():
    """Main application function with interactive menu"""
    try:
        print_header()
        
        # Initialize database connection and employee manager
        print("\nInitializing SQLite database connection...")
        db = DatabaseConnection()
        employee_manager = EmployeeManager()
        
        # Create tables
        print("Creating employee table...")
        db.create_tables()
        print("Database initialized successfully!")
        
        # Main application loop
        while True:
            print_menu()
            choice = get_user_choice()
            
            if choice == '1':  # Register New Employee
                print_section_header("EMPLOYEE REGISTRATION")
                employee_manager.register_employee()
                
            elif choice == '2':  # View All Employees
                print_section_header("ALL EMPLOYEE RECORDS")
                all_employees = employee_manager.get_all_employees()
                employee_manager.display_employees_table(all_employees, "All Employees")
                
            elif choice == '3':  # View Employees by Designation
                print_section_header("VIEW BY DESIGNATION")
                handle_view_by_designation(employee_manager)
                
            elif choice == '4':  # Update Employee Details
                print_section_header("UPDATE EMPLOYEE DETAILS")
                # First show all employees for reference
                all_employees = employee_manager.get_all_employees()
                if all_employees:
                    employee_manager.display_employees_table(all_employees, "Current Employees")
                    handle_update_employee(employee_manager)
                else:
                    print("No employees found!")
                    
            elif choice == '5':  # Delete Employee
                print_section_header("DELETE EMPLOYEE")
                # First show all employees for reference
                all_employees = employee_manager.get_all_employees()
                if all_employees:
                    employee_manager.display_employees_table(all_employees, "Current Employees")
                    handle_delete_employee(employee_manager)
                else:
                    print("No employees found!")
                    
            elif choice == '6':  # Update Salaries by Designation
                print_section_header("SALARY UPDATES")
                handle_salary_updates(employee_manager)
                
            elif choice == '7':  # Insert Demo Data
                print_section_header("INSERT DEMO DATA")
                confirm = input("This will insert 12 demo employees. Continue? (y/n): ").strip().lower()
                if confirm == 'y':
                    employee_manager.insert_demo_employees()
                else:
                    print("Demo data insertion cancelled.")
                    
            elif choice == '8':  # Employee Summary Statistics
                show_statistics(employee_manager)
                
            elif choice == '9':  # Exit
                print("\n" + "=" * 60)
                print(" " * 20 + "THANK YOU FOR USING THE SYSTEM")
                print("=" * 60)
                print("Application closed successfully.")
                break
                
            # Pause before showing menu again
            input("\nPress Enter to continue...")
        
    except KeyboardInterrupt:
        print("\n\nApplication interrupted by user.")
        print("Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        print("Please restart the application.")
        sys.exit(1)

if __name__ == "__main__":
    main()
