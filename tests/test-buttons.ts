import { SlackInteractionController } from '../src/controllers/SlackInteractionController';

// Mock Slack app and receiver for testing
const mockSlackApp = {
  action: (actionId: string | RegExp, handler: Function) => {
    console.log(`✅ Registered action: ${actionId}`);
  },
  view: (viewId: string, handler: Function) => {
    console.log(`✅ Registered view: ${viewId}`);
  },
  shortcut: (shortcutId: string, handler: Function) => {
    console.log(`✅ Registered shortcut: ${shortcutId}`);
  }
} as any;

const mockReceiver = {} as any;

// Test button registration
console.log('🧪 Testing Button Handler Registration...\n');

const controller = new SlackInteractionController(mockSlackApp, mockReceiver);
controller.register();

console.log('\n🎉 All handlers should be registered!');
console.log('\nNext steps:');
console.log('1. Run `npm run dev` to start the server');
console.log('2. Install the app to your Slack workspace');
console.log('3. Test each button in the app home');
console.log('4. Verify no "action not found" errors appear');