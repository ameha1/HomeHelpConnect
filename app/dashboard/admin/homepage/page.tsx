'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function WelcomePage() {
  const router = useRouter();

  const handleRedirect = () => {
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/homepage/homepage.png')", // Ensure your image is in public/homepage/
      }}
    >
      <div className="text-center space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-white text-6xl font-extrabold drop-shadow-md"
        >
          Welcome to HomeHelp Connect Admin page
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="text-white text-lg max-w-2xl mx-auto drop-shadow-md"
        >
          Your trusted platform to simplify home management. Connect with reliable helpers,
          streamline tasks, and experience smarter living — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Button
            onClick={handleRedirect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg rounded-xl shadow-xl hover:scale-125"
          >
            Login In to Continue
          </Button>
        </motion.div>
      </div>
    </div>
  );
}



