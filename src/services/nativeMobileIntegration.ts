/**
 * Native Mobile Integration Service
 * 
 * Comprehensive mobile platform integration for PrayerMap:
 * - Push notifications for prayer responses
 * - Status bar styling and safe areas
 * - App state management
 * - Background processing
 * - Deep linking
 * 
 * SPIRITUAL MISSION: Seamless prayer notifications that never miss a moment
 */

import { 
  PushNotifications, 
  PushNotificationSchema,
  ActionPerformed,
  Token 
} from '@capacitor/push-notifications';
import { 
  LocalNotifications,
  LocalNotificationSchema 
} from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App, AppState } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface PrayerNotification {
  id: number;
  title: string;
  body: string;
  prayerId: string;
  responderId: string;
  responderName: string;
  responseType: 'text' | 'audio' | 'video';
  timestamp: Date;
  isUrgent?: boolean;
}

interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

interface AppStateInfo {
  isActive: boolean;
  isVisible: boolean;
  lastActiveTime: Date;
  backgroundDuration: number;
}

export class NativeMobileIntegration {
  private pushToken: string | null = null;
  private appState: AppStateInfo = {
    isActive: true,
    isVisible: true,
    lastActiveTime: new Date(),
    backgroundDuration: 0
  };
  private notificationHandlers: Map<string, (notification: any) => void> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;

    console.log('🚀 Initializing native mobile integrations...');

    try {
      // Initialize all native features in parallel
      await Promise.allSettled([
        this.setupPushNotifications(),
        this.setupLocalNotifications(), 
        this.setupStatusBar(),
        this.setupSplashScreen(),
        this.setupAppStateHandling(),
        this.setupDeepLinking()
      ]);

      this.isInitialized = true;
      console.log('✅ Native mobile integration complete');

    } catch (error) {
      console.error('❌ Failed to initialize native features:', error);
      throw error;
    }
  }

  /**
   * Push Notifications Setup
   */
  private async setupPushNotifications(): Promise<void> {
    try {
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Register with FCM/APNS
      await PushNotifications.register();

      // Listen for registration token
      await PushNotifications.addListener('registration', (token: Token) => {
        this.pushToken = token.value;
        console.log('📱 Push token received:', token.value);
        
        // Send token to backend
        this.sendTokenToServer(token.value);
      });

      // Listen for push notifications
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('📬 Push notification received:', notification);
          this.handlePushNotification(notification);
        }
      );

      // Listen for notification actions
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('🔔 Notification action performed:', action);
          this.handleNotificationAction(action);
        }
      );

    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  /**
   * Local Notifications Setup
   */
  private async setupLocalNotifications(): Promise<void> {
    try {
      const permissionStatus = await LocalNotifications.requestPermissions();
      
      if (permissionStatus.display !== 'granted') {
        console.warn('Local notification permission denied');
        return;
      }

      // Listen for local notification actions
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          console.log('🔔 Local notification action:', action);
          this.handleNotificationAction(action);
        }
      );

    } catch (error) {
      console.error('Local notification setup failed:', error);
    }
  }

  /**
   * Status Bar Configuration
   */
  private async setupStatusBar(): Promise<void> {
    try {
      // Configure status bar for PrayerMap's ethereal aesthetic
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#E8F4F8' });
      await StatusBar.setOverlaysWebView({ overlay: false });

      console.log('📱 Status bar configured');
    } catch (error) {
      console.error('Status bar setup failed:', error);
    }
  }

  /**
   * Splash Screen Management
   */
  private async setupSplashScreen(): Promise<void> {
    try {
      // Hide splash screen after app is ready
      setTimeout(async () => {
        await SplashScreen.hide({ fadeOutDuration: 500 });
      }, 2000);

      console.log('🎨 Splash screen configured');
    } catch (error) {
      console.error('Splash screen setup failed:', error);
    }
  }

  /**
   * App State Management
   */
  private async setupAppStateHandling(): Promise<void> {
    try {
      await App.addListener('appStateChange', (state: AppState) => {
        const now = new Date();
        
        if (state.isActive) {
          // App came to foreground
          this.appState.backgroundDuration = now.getTime() - this.appState.lastActiveTime.getTime();
          this.handleAppForeground();
        } else {
          // App went to background
          this.appState.lastActiveTime = now;
          this.handleAppBackground();
        }
        
        this.appState.isActive = state.isActive;
        console.log('📱 App state changed:', state);
      });

      // Handle app URL open
      await App.addListener('appUrlOpen', (event) => {
        console.log('🔗 App opened via URL:', event.url);
        this.handleDeepLink(event.url);
      });

      console.log('🔄 App state monitoring active');
    } catch (error) {
      console.error('App state setup failed:', error);
    }
  }

  /**
   * Deep Linking Setup
   */
  private async setupDeepLinking(): Promise<void> {
    try {
      // Handle initial URL if app was opened via deep link
      const initialUrl = await App.getLaunchUrl();
      if (initialUrl?.url) {
        this.handleDeepLink(initialUrl.url);
      }

      console.log('🔗 Deep linking configured');
    } catch (error) {
      console.error('Deep linking setup failed:', error);
    }
  }

  /**
   * Notification Handlers
   */
  private handlePushNotification(notification: PushNotificationSchema): void {
    // Parse notification data
    const data = notification.data;
    const prayerId = data?.prayerId;
    const responseType = data?.responseType || 'text';

    // Trigger haptic feedback
    this.triggerHaptic(ImpactStyle.Medium);

    // Show local notification if app is in foreground
    if (this.appState.isActive) {
      this.showInAppNotification({
        id: Date.now(),
        title: notification.title || 'New Prayer Response',
        body: notification.body || 'Someone has responded to your prayer',
        prayerId: prayerId || '',
        responderId: data?.responderId || '',
        responderName: data?.responderName || 'Anonymous',
        responseType: responseType as 'text' | 'audio' | 'video',
        timestamp: new Date(),
        isUrgent: data?.isUrgent === 'true'
      });
    }

    // Emit event for app to handle
    this.notificationHandlers.get('received')?.(notification);
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const notification = action.notification;
    const actionId = action.actionId;

    console.log('🔔 Processing notification action:', actionId);

    switch (actionId) {
      case 'reply_quick':
        this.openQuickReply(notification.data?.prayerId);
        break;
      case 'view_prayer':
        this.openPrayer(notification.data?.prayerId);
        break;
      case 'mark_read':
        this.markPrayerAsRead(notification.data?.prayerId);
        break;
      default:
        // Default action - open app
        this.openPrayer(notification.data?.prayerId);
    }

    this.notificationHandlers.get('action')?.(action);
  }

  /**
   * App State Handlers
   */
  private handleAppForeground(): void {
    console.log('📱 App entered foreground');
    
    // Clear badge count
    this.clearBadgeCount();
    
    // Refresh data if app was backgrounded for a while
    if (this.appState.backgroundDuration > 300000) { // 5 minutes
      this.notificationHandlers.get('refresh_data')?.({
        backgroundDuration: this.appState.backgroundDuration
      });
    }

    // Resume real-time connections
    this.notificationHandlers.get('resume_connections')?.({});
  }

  private handleAppBackground(): void {
    console.log('📱 App entered background');
    
    // Reduce connection frequency
    this.notificationHandlers.get('reduce_connections')?.({});
    
    // Save critical app state
    this.notificationHandlers.get('save_state')?.({});
  }

  private handleDeepLink(url: string): void {
    console.log('🔗 Handling deep link:', url);
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = new URLSearchParams(urlObj.search);

      // Route based on path
      if (path.includes('/prayer/')) {
        const prayerId = path.split('/prayer/')[1];
        this.openPrayer(prayerId);
      } else if (path.includes('/conversation/')) {
        const conversationId = path.split('/conversation/')[1];
        this.openConversation(conversationId);
      }

      this.notificationHandlers.get('deep_link')?.(url);
    } catch (error) {
      console.error('Failed to handle deep link:', error);
    }
  }

  /**
   * Public Methods
   */
  public async sendPrayerNotification(notification: PrayerNotification): Promise<void> {
    try {
      const localNotification: LocalNotificationSchema = {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        smallIcon: 'prayer_icon',
        sound: 'prayer_notification.wav',
        actionTypeId: 'PRAYER_RESPONSE',
        extra: {
          prayerId: notification.prayerId,
          responderId: notification.responderId,
          responseType: notification.responseType
        },
        actions: [
          {
            id: 'reply_quick',
            title: 'Quick Reply'
          },
          {
            id: 'view_prayer', 
            title: 'View Prayer'
          }
        ]
      };

      await LocalNotifications.schedule({
        notifications: [localNotification]
      });

      // Haptic feedback for urgent prayers
      if (notification.isUrgent) {
        await this.triggerHaptic(ImpactStyle.Heavy);
      }

    } catch (error) {
      console.error('Failed to send prayer notification:', error);
    }
  }

  public async scheduleReminderNotification(
    prayerId: string,
    title: string,
    body: string,
    reminderTime: Date
  ): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          schedule: { at: reminderTime },
          extra: { prayerId, type: 'reminder' }
        }]
      });
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  }

  public async triggerHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  public async clearBadgeCount(): Promise<void> {
    try {
      await LocalNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('Failed to clear badge count:', error);
    }
  }

  public onNotificationEvent(event: string, handler: (data: any) => void): void {
    this.notificationHandlers.set(event, handler);
  }

  public async requestAllPermissions(): Promise<{
    push: boolean;
    local: boolean;
    haptics: boolean;
  }> {
    const results = {
      push: false,
      local: false,
      haptics: true // Always available
    };

    try {
      // Push notifications
      const pushPermission = await PushNotifications.requestPermissions();
      results.push = pushPermission.receive === 'granted';

      // Local notifications  
      const localPermission = await LocalNotifications.requestPermissions();
      results.local = localPermission.display === 'granted';

    } catch (error) {
      console.error('Permission request failed:', error);
    }

    return results;
  }

  /**
   * Private Helper Methods
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // Send push token to your backend
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: Capacitor.getPlatform() })
      });

      if (!response.ok) {
        throw new Error(`Failed to register token: ${response.status}`);
      }

      console.log('✅ Push token registered with server');
    } catch (error) {
      console.error('Failed to send token to server:', error);
    }
  }

  private showInAppNotification(notification: PrayerNotification): void {
    // Create in-app notification banner
    const banner = document.createElement('div');
    banner.className = `
      fixed top-safe-area left-4 right-4 z-50
      glass-strong rounded-2xl p-4 shadow-xl
      transform transition-all duration-300 ease-out
      translate-y-[-100%] opacity-0
    `;
    
    banner.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
          <span class="text-white text-xl">🙏</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-gray-800 font-semibold truncate">${notification.title}</h4>
          <p class="text-gray-600 text-sm">${notification.body}</p>
        </div>
        <button class="p-1 hover:bg-white/20 rounded-full">
          <span class="text-gray-400">✕</span>
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      banner.style.transform = 'translateY(-100%)';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 300);
    }, 5000);

    // Click to open
    banner.addEventListener('click', () => {
      this.openPrayer(notification.prayerId);
      banner.remove();
    });
  }

  private openPrayer(prayerId: string): void {
    // Navigate to prayer detail
    window.location.hash = `#/prayer/${prayerId}`;
  }

  private openConversation(conversationId: string): void {
    // Navigate to conversation
    window.location.hash = `#/conversation/${conversationId}`;
  }

  private openQuickReply(prayerId: string): void {
    // Open quick reply interface
    this.notificationHandlers.get('quick_reply')?.({ prayerId });
  }

  private markPrayerAsRead(prayerId: string): void {
    // Mark prayer as read
    this.notificationHandlers.get('mark_read')?.({ prayerId });
  }

  /**
   * Getters
   */
  public get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public get platform(): string {
    return Capacitor.getPlatform();
  }

  public get appStateInfo(): AppStateInfo {
    return { ...this.appState };
  }

  public get hasPushToken(): boolean {
    return !!this.pushToken;
  }
}

// Global instance
export const nativeMobile = new NativeMobileIntegration();

// Initialize on module load if on native platform
if (Capacitor.isNativePlatform()) {
  nativeMobile.initialize().catch(console.error);
}

export default nativeMobile;