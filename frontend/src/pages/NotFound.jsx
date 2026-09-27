import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Bits';
import Button from '@/components/ui/Button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="There is no page at this address"
      body="The link may be old, or the record may have been removed."
      action={
        <Link to="/">
          <Button variant="outline">Go to overview</Button>
        </Link>
      }
    />
  );
}
