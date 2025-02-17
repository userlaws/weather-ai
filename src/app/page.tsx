'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

// Update global WebChat interface with proper types
declare global {
  interface Window {
    WebChat: {
      default: {
        send: (message: { text: string }) => void;
        toggle: () => void;
      };
    };
    rasaWebchatInstance?: {
      send: (message: { text: string }) => void;
      toggle: () => void;
    };
  }
}

interface WeatherData {
  temperature: number;
  feels_like: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  icon: string;
}

interface GeoLocation {
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
}

interface Message {
  text?: string;
  type: 'user' | 'ai' | 'weather';
  data?: WeatherData;
  location?: string;
}

interface LocationContext {
  current: string | null;
  previous: string | null;
  timestamp: number;
}

interface WeatherContext {
  location: string;
  data: WeatherData;
  timestamp: number;
}

const Home: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userLocation] = useState<GeoLocation | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Location context state
  const [locationContext, setLocationContext] = useState<LocationContext>({
    current: null,
    previous: null,
    timestamp: Date.now(),
  });
  const [weatherContext, setWeatherContext] = useState<WeatherContext[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!mounted) {
    return null;
  }

  // Add helper functions for context management
  const updateLocationContext = (newLocation: string) => {
    setLocationContext((prev) => ({
      current: newLocation,
      previous: prev.current,
      timestamp: Date.now(),
    }));
  };

  const addWeatherContext = (location: string, data: WeatherData) => {
    setWeatherContext((prev) => {
      // Remove old data for the same location
      const filtered = prev.filter((w) => w.location !== location);
      return [...filtered, { location, data, timestamp: Date.now() }];
    });
  };

  const getLocation = (queryText: string) => {
    const lastWeatherMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.type === 'weather' && msg.location);

    // Enhanced location patterns
    const locationPatterns = [
      /weather (?:in|at|for) ([^?.,!]+)/i,
      /(?:how about|what about|and|in) ([^?.,!]+)/i,
      /(?:how's|what's|hows|whats) (?:it|the weather) (?:in|at|like in|like at) ([^?.,!]+)/i,
      /(?:what is|tell me|show me) (?:the weather|temperature) (?:in|at|for) ([^?.,!]+)/i,
    ];

    // Enhanced relative patterns
    const relativePatterns = [
      /(?:over|out) there/i,
      /that location/i,
      /that place/i,
      /there now/i,
      /the same place/i,
      /that city/i,
    ];

    // Check for explicit location mentions
    for (const pattern of locationPatterns) {
      const match = queryText.match(pattern);
      if (match) {
        const location = match[1].trim();
        updateLocationContext(location);
        return location;
      }
    }

    // Check for relative references with improved context
    for (const pattern of relativePatterns) {
      if (pattern.test(queryText)) {
        // First check the most recent weather context
        if (locationContext.current) {
          return locationContext.current;
        }
        // Fall back to the last weather message
        if (lastWeatherMessage?.location) {
          updateLocationContext(lastWeatherMessage.location);
          return lastWeatherMessage.location;
        }
      }
    }

    // Finally, fall back to user's location if it's a general weather query
    if (queryText.toLowerCase().includes('weather') && userLocation) {
      return `${userLocation.city}, ${userLocation.region}`;
    }

    // If we have a last known location and the query seems to be asking about weather
    if (
      lastWeatherMessage?.location &&
      /(?:weather|temperature|rain|sunny|cloudy|cold|hot|warm|cool)/i.test(
        queryText
      )
    ) {
      return lastWeatherMessage.location;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsLoading(true);
      try {
        setMessages((prev) => [...prev, { text: query, type: 'user' }]);

        const location = getLocation(query);
        let weatherInfo = '';

        if (location) {
          try {
            const geoResponse = await fetch(
              `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
                location
              )}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
            );
            const geoData = await geoResponse.json();

            if (geoData.length > 0) {
              const { lat, lon } = geoData[0];
              const weatherResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
              );
              const weatherData = await weatherResponse.json();

              const processedWeatherData: WeatherData = {
                temperature: Math.round(weatherData.main.temp),
                feels_like: Math.round(weatherData.main.feels_like),
                condition: weatherData.weather[0].main,
                humidity: weatherData.main.humidity,
                wind_speed: Math.round(weatherData.wind.speed),
                icon: weatherData.weather[0].icon,
              };

              // Add to weather context
              addWeatherContext(location, processedWeatherData);

              setMessages((prev) => [
                ...prev,
                {
                  type: 'weather',
                  location,
                  data: processedWeatherData,
                  text: `Weather in ${location}`,
                },
              ]);

              weatherInfo = `Current weather in ${location}:
Temperature: ${processedWeatherData.temperature}°F
Feels like: ${processedWeatherData.feels_like}°F
Condition: ${processedWeatherData.condition}
Humidity: ${processedWeatherData.humidity}%
Wind Speed: ${processedWeatherData.wind_speed} mph`;
            }
          } catch (weatherError) {
            console.error('Weather API error:', weatherError);
            weatherInfo = 'Sorry, I could not fetch the weather data.';
          }
        }

        // Enhanced Llama prompt with better context
        const llamaResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are a helpful weather assistant. Here's the detailed context:

Location Context:
- Current Location: ${locationContext.current || 'Unknown'}
- Previous Location: ${locationContext.previous || 'None'}
- Recent Locations: ${weatherContext
              .slice(-3)
              .map((w) => w.location)
              .join(', ')}

Conversation History:
${messages
  .slice(-4)
  .map((msg) => {
    if (msg.type === 'weather') {
      return `Location: ${msg.location}
Weather: ${msg.data?.temperature}°F (feels like ${msg.data?.feels_like}°F), ${msg.data?.condition}, Wind: ${msg.data?.wind_speed} mph`;
    }
    return `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.text}`;
  })
  .join('\n')}

Current Weather Data: ${weatherInfo}

User Question: ${query}

Instructions:
1. Be specific about which location you're discussing
2. Compare with previous location when relevant
3. Keep responses conversational but brief (1-2 sentences)
4. Acknowledge location changes when they occur
5. Use the most recent weather data available`,
          }),
        });

        if (!llamaResponse.ok) {
          throw new Error(`API error: ${llamaResponse.statusText}`);
        }

        const data = await llamaResponse.json();

        if (data.error) {
          throw new Error(data.details || data.error);
        }

        setMessages((prev) => [
          ...prev,
          {
            text: data.response || 'No response from AI',
            type: 'ai',
          },
        ]);
        setQuery('');
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        setMessages((prev) => [
          ...prev,
          {
            text:
              error instanceof Error
                ? `Error: ${error.message}`
                : 'Sorry, I encountered an error. Please try again.',
            type: 'ai',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Update the weather display to use next/image
  const WeatherIcon = ({
    icon,
    condition,
  }: {
    icon: string;
    condition: string;
  }) => (
    <Image
      src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
      alt={condition}
      width={40}
      height={40}
      className='w-10 h-10 sm:w-12 sm:h-12'
    />
  );

  // Update the instructions text to fix escape characters
  const instructions = [
    {
      text: 'If you want the visual representation of the weather then you have to include the word weather. (e.g., &quot;What&apos;s the weather in NYC?&quot;)',
    },
    {
      text: 'Ask about weather in any city (e.g., &quot;What&apos;s the weather in Tokyo?&quot;)',
    },
    {
      text: 'Compare weather between cities',
    },
    {
      text: 'Ask about specific conditions (temperature, wind, etc.)',
    },
    {
      text: 'Get real-time weather updates',
    },
  ];

  // Update the message display to use the WeatherIcon component
  const MessageDisplay = () => (
    <div className='fixed bottom-16 right-0 left-0 mx-4 md:mx-0 md:right-8 md:left-auto md:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700'>
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
          Chat History
        </h2>
      </div>

      {/* Add a scrollable container with fixed height */}
      <div className='flex-1 overflow-y-auto max-h-[400px] space-y-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${
              msg.type === 'user' ? 'ml-auto' : ''
            } max-w-[85%] p-3 rounded-xl ${
              msg.type === 'user'
                ? 'bg-blue-500 text-white ml-auto'
                : msg.type === 'weather'
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {msg.type === 'weather' && msg.data ? (
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1'>
                <div className='flex items-center gap-2'>
                  <WeatherIcon
                    icon={msg.data.icon}
                    condition={msg.data.condition}
                  />
                  <span className='text-xl sm:text-2xl font-bold text-sky-800 dark:text-sky-200'>
                    {msg.data.temperature}°F
                  </span>
                </div>
                <span className='text-base sm:text-lg text-sky-600 dark:text-sky-300 capitalize'>
                  {msg.data.condition}
                </span>
              </div>
            ) : (
              <div
                className={`${
                  msg.type === 'user'
                    ? 'text-gray-800 dark:text-gray-200'
                    : 'text-gray-700 dark:text-gray-300'
                } ${
                  msg.type === 'ai' ? 'text-xs sm:text-sm italic' : ''
                } break-words`}
              >
                {msg.type === 'user' ? `🙋 ${msg.text}` : msg.text}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen pb-32 ${
        theme === 'dark'
          ? 'bg-gray-900 text-white'
          : 'bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 text-gray-800'
      } transition-colors duration-300`}
    >
      <div className='container mx-auto px-4 py-16 sm:py-12'>
        <div className='flex justify-between mb-8'>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className='p-3 rounded-full bg-white/90 dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300'
            aria-label='Show instructions'
          >
            ❔
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className='p-3 rounded-full bg-white/90 dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300'
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {showInstructions && (
          <div className='w-full p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-4'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                How to Use the Weather AI
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              >
                ✕
              </button>
            </div>
            <ul className='space-y-2 text-gray-700 dark:text-gray-300'>
              {instructions.map((instruction, index) => (
                <li
                  key={index}
                  dangerouslySetInnerHTML={{ __html: `• ${instruction.text}` }}
                />
              ))}
            </ul>
          </div>
        )}

        <main className='flex flex-col items-center max-w-4xl mx-auto space-y-6 sm:space-y-8'>
          <div className='text-center w-full'>
            <h1 className='text-3xl sm:text-4xl md:text-6xl font-bold text-black dark:text-black mb-2 sm:mb-4'>
              Weather AI Assistant
            </h1>
            <p className='text-base sm:text-lg md:text-xl text-gray-900 dark:text-gray-300'>
              Your intelligent companion for weather insights
            </p>
          </div>

          <div className='w-full p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700'>
            <form onSubmit={handleSubmit} className='space-y-3 sm:space-y-4'>
              <input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Ask about the weather anywhere...'
                className='w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-500'
                disabled={isLoading}
              />
              <button
                type='submit'
                className={`w-full p-4 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl`}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Fetching Weather Data...'
                  : 'Get Weather Insights'}
              </button>
            </form>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full'>
            {[
              {
                icon: '🎯',
                title: 'Real-Time Accuracy',
                desc: 'Up-to-the-minute weather data',
              },
              {
                icon: '🤖',
                title: 'AI-Powered Insights',
                desc: 'Smart analysis and recommendations',
              },
              {
                icon: '🌍',
                title: 'Global Coverage',
                desc: 'Weather information worldwide',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'
              >
                <div className='text-4xl mb-3'>{feature.icon}</div>
                <h3 className='text-lg font-semibold mb-2 text-gray-800 dark:text-white'>
                  {feature.title}
                </h3>
                <p className='text-gray-700 dark:text-gray-300 text-sm'>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className='fixed bottom-0 w-full py-2 sm:py-3 text-center text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700'>
        <div className='flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4'>
          <p className='text-sm sm:text-base'>
            Powered by Advanced Weather AI Technology
          </p>
          <a
            href='https://github.com/userlaws'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-sm sm:text-base'
          >
            <svg
              height='20'
              width='20'
              viewBox='0 0 16 16'
              className='fill-current'
            >
              <path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </footer>

      <MessageDisplay />
    </div>
  );
};

export default Home;
