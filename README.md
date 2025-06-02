# HomeHelp - Service Provider Platform

HomeHelp is a modern web application that connects homeowners with service providers. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- User Authentication (Homeowners and Service Providers)
- Service Provider Management
- Booking System
- Real-time Messaging
- Rating and Review System
- Admin Dashboard
- Responsive Design

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn UI
- Prisma
- PostgreSQL

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/homehelp.git
cd homehelp
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory and add the following:
```env
DATABASE_URL="your_database_url"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3001"
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
homehelp/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── register/          # Registration pages
│   └── services/          # Service pages
├── components/            # Reusable components
├── lib/                   # Utility functions and types
└── public/               # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. "# HomeHelpConnect-" 
