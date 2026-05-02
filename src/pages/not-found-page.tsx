import { Link } from 'react-router-dom';
import { HeroShell } from '@/components/layout/hero-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function NotFoundPage() {
  return (
    <HeroShell className="items-center justify-center">
      <Card className="max-w-lg">
        <CardContent className="space-y-4">
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <p className="text-slate-500">The route you opened is outside the current meeting flow.</p>
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    </HeroShell>
  );
}
