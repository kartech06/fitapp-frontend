import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { getMe } from '../../shared/api/user.api';
import { getPricing, createOrder, verifyPayment } from '../../shared/api/subscription.api';
import { useTheme } from '../../shared/hooks/useTheme';
import { usePlan } from '../../shared/hooks/usePlan';
import { useAuthStore } from '../../shared/store/authStore';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';

const FEATURES = [
  { name: 'AI Coach Chat', free: 'Locked 🔒', basic: 'Unlimited ✦' },
  { name: 'Photo Meal Recognition', free: '3 / day', basic: 'Unlimited' },
  { name: 'Natural Language Meal Log', free: '5 / day', basic: 'Unlimited' },
  { name: 'Workout & Diet Plans', free: 'Static AI Plan', basic: 'Dynamic Recalculations' },
  { name: 'Progress Insights & Charts', free: '7-Day History', basic: 'All-Time History' },
];

export function SubscriptionScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation();
  const { plan } = usePlan();
  const setPlan = useAuthStore(s => s.setPlan);
  const queryClient = useQueryClient();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: pricing, isLoading: isPricingLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
  });

  const currentPlan = me?.subscription?.plan || plan;
  const isFree = currentPlan === 'FREE';

  const handleUpgrade = async () => {
    if (isCheckingOut) return;
    try {
      setIsCheckingOut(true);
      
      // 1. Create order
      const order = await createOrder();
      
      // 2. Open Razorpay Checkout
      const options = {
        description: 'BASIC Plan Subscription',
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        name: 'FitApp',
        order_id: order.orderId,
        theme: { color: colors.primary },
        prefill: {
          email: me?.email || '',
          name: me?.name || '',
        }
      };

      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          // 3. Verify payment
          try {
            await verifyPayment({
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
            });

            // 4. On success
            setPlan('BASIC');
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            
            Alert.alert('Success', 'Welcome to FitApp Basic! 🎉');
            navigation.goBack();
          } catch (verifyError: any) {
            Alert.alert('Verification Failed', verifyError?.response?.data?.message || 'Could not verify payment.');
          } finally {
            setIsCheckingOut(false);
          }
        })
        .catch((error: any) => {
          setIsCheckingOut(false);
          // Handle cancellation gracefully
          if (error.code !== 2) { // Assuming 2 is user cancelled
            Alert.alert('Payment Failed', error.description || 'An error occurred during payment.');
          }
        });
    } catch (err: any) {
      setIsCheckingOut(false);
      Alert.alert('Error', err?.response?.data?.message || 'Could not initialize checkout.');
    }
  };

  const renderPricing = () => {
    if (isPricingLoading || !pricing) {
      return <ActivityIndicator color={colors.primary} size="small" />;
    }

    if (pricing.promoActive && pricing.promoPriceInPaise) {
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={[typography.body, { color: colors.textDim, textDecorationLine: 'line-through', marginRight: spacing.sm }]}>
              ₹{pricing.priceInPaise / 100}
            </Text>
            <Text style={[typography.h3, { color: colors.text }]}>
              ₹{pricing.promoPriceInPaise / 100} / month
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: 'bold' }]}>
            Limited time offer!
          </Text>
        </View>
      );
    }

    return (
      <Text style={[typography.h3, { color: colors.text }]}>
        ₹{pricing.priceInPaise / 100} / month
      </Text>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.md }]}>Subscription</Text>
        </View>

        {/* Current Plan Banner */}
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={[typography.label, { color: colors.textDim, marginBottom: spacing.xs }]}>YOUR CURRENT PLAN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.h2, { color: colors.text, marginRight: spacing.sm }]}>
              {currentPlan === 'BASIC' ? 'FitApp Basic' : 'FitApp Free'}
            </Text>
            <Badge variant={{ type: 'plan', plan: currentPlan }} />
          </View>
          <Text style={[typography.bodySmall, { color: colors.textDim, textAlign: 'center' }]}>
            {currentPlan === 'BASIC'
              ? 'You have unlimited access to all AI Coach features & logging tools.'
              : 'Upgrade to Basic to unlock AI Coaching and unlimited daily meal logs.'}
          </Text>
          {currentPlan === 'BASIC' && me?.subscription?.currentPeriodEnd && (
            <Text style={[typography.caption, { color: colors.primary, marginTop: spacing.sm, fontWeight: '600' }]}>
              Active until {new Date(me.subscription.currentPeriodEnd).toLocaleDateString()}
            </Text>
          )}
        </Card>

        {/* Comparison Table */}
        <Text style={[typography.label, { color: colors.textDim, marginBottom: spacing.sm }]}>PLAN COMPARISON</Text>
        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          {/* Table Header */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface2,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
            }}
          >
            <Text style={[typography.label, { color: colors.textDim, flex: 2 }]}>FEATURE</Text>
            <Text style={[typography.label, { color: colors.textDim, flex: 1, textAlign: 'center' }]}>FREE</Text>
            <Text style={[typography.label, { color: colors.primary, flex: 1, textAlign: 'center' }]}>BASIC</Text>
          </View>

          {/* Table Rows */}
          {FEATURES.map((f, idx) => (
            <View
              key={f.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderBottomWidth: idx < FEATURES.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[typography.bodySmall, { color: colors.text, flex: 2, fontWeight: '500' }]}>{f.name}</Text>
              <Text style={[typography.caption, { color: colors.textDim, flex: 1, textAlign: 'center' }]}>{f.free}</Text>
              <Text style={[typography.caption, { color: colors.text, flex: 1, textAlign: 'center', fontWeight: '600' }]}>{f.basic}</Text>
            </View>
          ))}
        </Card>

        {/* Pricing & Upgrade */}
        {isFree ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ marginBottom: spacing.md }}>
              {renderPricing()}
            </View>
            <Button
              title="Upgrade to Basic"
              onPress={handleUpgrade}
              variant="primary"
              loading={isCheckingOut}
              disabled={isCheckingOut || isPricingLoading}
              style={{ width: '100%' }}
            />
          </View>
        ) : (
          <Button
            title="Current Plan: Active"
            onPress={() => {}}
            disabled={true}
          />
        )}
      </ScrollView>
    </View>
  );
}
