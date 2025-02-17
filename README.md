# Weather AI Assistant

An intelligent weather assistant powered by Next.js, OpenWeather API, and Together AI's Llama model.

## Features

- 🌡️ Real-time weather data from OpenWeather API
- 🤖 AI-powered weather insights using Llama 3.2
- 🌍 Global weather coverage
- 🎨 Dark/Light theme support
- 📱 Responsive design
- 💬 Natural language interaction

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/userlaws/weather-ai.git
cd weather-ai
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your API keys:

```env
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key
TOGETHER_API_KEY=your_together_api_key
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
TOGETHER_API_KEY=your_together_api_key
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key
```

Get your API keys from:

- Together AI: https://api.together.ai
- OpenWeather: https://home.openweathermap.org/api_keys

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Together AI](https://www.together.ai/)
- [OpenWeather API](https://openweathermap.org/api)

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## Deployment

The app is optimized for deployment on Vercel. Simply push to your GitHub repository and connect it to Vercel for automatic deployments.

## License

MIT License - feel free to use this project for your own purposes.
