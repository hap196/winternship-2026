'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-destructive text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">
            Something went wrong!
          </h2>
          <p className="text-muted-foreground mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset}>
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

