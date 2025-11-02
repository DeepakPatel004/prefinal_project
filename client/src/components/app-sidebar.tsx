import { Home, FileText, LayoutDashboard, Users, Shield, HelpCircle, CheckSquare, UserCog } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/authContext";
import { useI18n } from '@/lib/i18n';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

// Define menu items by role
const publicMenuItems = [
  {
    titleKey: 'home',
    url: "/",
    icon: Home,
    testId: "link-home",
  },
  {
    titleKey: 'loginTitle',
    url: "/login",
    icon: Users,
    testId: "link-login",
  },
];

const citizenMenuItems = [
  {
    titleKey: 'home',
    url: "/",
    icon: Home,
    testId: "link-home",
  },
  {
    titleKey: 'submitGrievance',
    url: "/submit",
    icon: FileText,
    testId: "link-submit",
  },
  {
    titleKey: 'myDashboard',
    url: "/dashboard",
    icon: LayoutDashboard,
    testId: "link-dashboard",
  },
  {
    titleKey: 'communityVerification',
    url: "/community",
    icon: CheckSquare,
    testId: "link-community",
  },
];

const officialMenuItems = [
  {
    titleKey: 'home',
    url: "/",
    icon: Home,
    testId: "link-home",
  },
  {
    titleKey: 'officialDashboard',
    url: "/official",
    icon: Users,
    testId: "link-official",
  },
];

const adminMenuItems = [
  {
    titleKey: 'adminPanel',
    url: "/admin",
    icon: UserCog,
    testId: "link-admin",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const { t } = useI18n();

  // Determine which menu items to show based on role
  const getMenuItems = () => {
    if (loading) return [];
    if (!user) return publicMenuItems;
    
    switch (user.role) {
      case 'admin':
        // Admin should see admin items only (do not show official/officer dashboard in admin sidebar)
        return adminMenuItems;
      case 'official':
        return officialMenuItems;
      case 'citizen':
        return citizenMenuItems;
      default:
        return publicMenuItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">{t('grievanceSystem')}</div>
            <div className="text-xs text-muted-foreground">{t('governmentOfIndia')}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel>{t('helpAndSupport')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-testid="link-help">
                    <Link href="/help">
                      <HelpCircle className="w-4 h-4" />
                      <span>{t('helpCenter')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {user && (
        <SidebarFooter className="p-4 border-t pb-28 sm:pb-24 md:pb-20">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{user.fullName || user.username}</div>
            <button 
              onClick={() => {
                // Clear token and redirect to login
                localStorage.removeItem('auth_token');
                sessionStorage.removeItem('auth_token');
                window.location.href = '/login';
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {t('logout')}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-3 h-3" />
            {t('blockchainSecured')} | {t('callHelpline')} 1800-XXX-XXXX
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
