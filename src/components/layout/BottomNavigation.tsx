import { Home, MapPin, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'My Seat',
    href: '/my-seat',
    icon: MapPin,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export const BottomNavigation = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <nav className="flex justify-around items-center h-16 px-4">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-5 w-5', isActive && 'fill-current')} />
                <span className="text-xs font-medium truncate">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};