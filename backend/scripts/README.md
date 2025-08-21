# Backend Scripts

This directory contains utility scripts for database management and testing.

## Scripts

### `addUser.ts`
- **Purpose**: Add a new user to the database
- **Usage**: `npx tsx scripts/addUser.ts`
- **Description**: Creates a user with email `skar@adobe.com` and password `111111` if it doesn't already exist

### `checkUser.ts`
- **Purpose**: Check user details in the database
- **Usage**: `npx tsx scripts/checkUser.ts`
- **Description**: Displays details of the user with email `skar@adobe.com`

### `testLogin.ts`
- **Purpose**: Test login functionality directly against the database
- **Usage**: `npx tsx scripts/testLogin.ts`
- **Description**: Tests the login query logic to verify user credentials

### `resetAdmin.ts`
- **Purpose**: Reset all admin users and create new admin users
- **Usage**: `npx tsx scripts/resetAdmin.ts`
- **Description**: Deletes all existing admin users (super_admin and project_admin) and creates:
  - Super admin: email `qd@adobe.com`, password `111111`, userType `super_admin`
  - Admin: email `skar@adobe.com`, password `111111`, userType `admin`

### `cookies.txt`
- **Purpose**: Temporary file for storing cookies during API testing
- **Description**: Created by curl commands during manual API testing

### `getAdminUsers.ts`
- **Purpose**: View all admin users in the database
- **Usage**: `npx tsx scripts/getAdminUsers.ts`
- **Description**: Displays all admin users (super_admin and project_admin) with their details including names, emails, and user types

## Running Scripts

All scripts should be run from the `