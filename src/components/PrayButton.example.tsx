/**
 * PrayButton Usage Examples
 *
 * Demonstrates different configurations of the PrayButton component
 */

import { PrayButton } from './PrayButton';

/**
 * Example 1: Basic Usage
 * Simple prayer button with default settings
 */
export function BasicPrayButton() {
  const handlePray = () => {
    console.log('Prayer sent!');
    // Your prayer submission logic here
  };

  return (
    <PrayButton onPray={handlePray} />
  );
}

/**
 * Example 2: With Quick Option
 * Shows optional quick prayer option (no message required)
 */
export function PrayButtonWithQuickOption() {
  const handlePray = () => {
    console.log('Prayer sent with intention');
  };

  return (
    <PrayButton
      onPray={handlePray}
      showQuickOption={true}
    />
  );
}

/**
 * Example 3: Loading State
 * Shows loading state while prayer is being sent
 */
export function PrayButtonLoading() {
  const handlePray = () => {
    console.log('Sending prayer...');
  };

  return (
    <PrayButton
      onPray={handlePray}
      isLoading={true}
    />
  );
}

/**
 * Example 4: Disabled State
 * Button disabled (e.g., when form is invalid)
 */
export function PrayButtonDisabled() {
  const handlePray = () => {
    console.log('This should not fire');
  };

  return (
    <PrayButton
      onPray={handlePray}
      disabled={true}
    />
  );
}

/**
 * Example 5: In a Modal/Form Context
 * Complete example with form integration
 */
export function PrayButtonInContext() {
  const [isSending, setIsSending] = useState(false);

  const handleSubmitPrayer = async () => {
    setIsSending(true);

    try {
      // Your API call here
      await sendPrayerToAPI();

      // Success - button will show success state
      console.log('Prayer sent successfully!');
    } catch (error) {
      console.error('Failed to send prayer:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Send Your Prayer</h2>

      <textarea
        className="w-full p-4 border rounded-lg mb-4"
        placeholder="Type your prayer here..."
        rows={4}
      />

      <PrayButton
        onPray={handleSubmitPrayer}
        isLoading={isSending}
        showQuickOption={true}
      />
    </div>
  );
}

/**
 * Example 6: Custom Styling
 * PrayButton with additional custom classes
 */
export function StyledPrayButton() {
  return (
    <PrayButton
      onPray={() => console.log('Stylish prayer!')}
      className="shadow-2xl"
    />
  );
}

// Mock API function for example
async function sendPrayerToAPI(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
}

// Import for the example
import { useState } from 'react';
