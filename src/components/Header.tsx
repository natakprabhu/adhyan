import { ChevronLeft, MoreVertical, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
}

export const Header = ({ 
  title = "Adhyan Library", 
  showBack = false, 
  showMenu = true,
  showNotifications = true 
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-none">{title}</h1>
            {location.pathname === '/home' && (
              <p className="text-xs text-muted-foreground">Premium Study Environment</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          {showMenu && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};