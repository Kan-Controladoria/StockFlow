# Overview

This is a Progressive Web Application (PWA) for inventory management specifically designed for the Super Kan supermarket's aerial stock control system. The application manages 150 fixed compartments arranged in a 5x3x10 grid (5 corridors × 3 rows × 10 columns) with addresses ranging from 1A1 to 5C10. The system allows users to track product inventory across these compartments, perform stock movements (entries and exits), and generate comprehensive reports.

The application features a responsive design optimized for both mobile and desktop use, with barcode scanning capabilities for efficient product identification. It includes user authentication, product management, a visual warehouse map, and detailed reporting functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query for server state management and React hooks for local state
- **PWA Features**: Service worker registration, web app manifest, and mobile-optimized UI

## Backend Architecture
- **Server**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Authentication**: Supabase Auth for user management
- **API Pattern**: RESTful APIs with Express routes (currently minimal server implementation)

## Data Storage Solutions
- **Primary Database**: PostgreSQL with the following core tables:
  - `profiles` - User profile information linked to Supabase Auth
  - `products` - Product catalog with 6 required fields (barcode, product code, name, department, category, subcategory)
  - `compartments` - Fixed 150 compartment layout with address system
  - `stock_by_compartment` - Current inventory levels per compartment/product
  - `movements` - Complete audit trail of all inventory transactions

## Authentication and Authorization
- **Authentication Provider**: Supabase Auth with email/password login
- **Session Management**: Automatic session handling with React hooks
- **Authorization**: Row Level Security (RLS) policies on Supabase tables
- **Access Control**: Read access for authenticated users, restricted write permissions

## External Dependencies

- **Supabase**: Backend-as-a-Service providing authentication, database, and real-time features
- **Neon Database**: Serverless PostgreSQL hosting
- **Radix UI**: Headless UI components for accessibility and consistency
- **TanStack Query**: Server state management and caching
- **Tailwind CSS**: Utility-first CSS framework
- **Drizzle ORM**: Type-safe database query builder
- **Vite**: Fast development server and build tool
- **React Hook Form**: Form state management and validation
- **Date-fns**: Date manipulation utilities
- **Lucide React**: Icon library for consistent iconography

The application integrates camera access for barcode scanning functionality and includes PWA capabilities for offline-ready mobile usage. The architecture supports real-time updates through Supabase's real-time subscriptions and maintains data consistency through proper database constraints and RLS policies.