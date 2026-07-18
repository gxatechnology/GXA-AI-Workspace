export type PlanKey = 'free' | 'pro' | 'pro_plus' | 'team' | 'enterprise';

export interface PublicPlan {
  id: PlanKey;
  key: PlanKey;
  name: string;
  displayName: string;
  description: string;
  currency: 'INR';
  monthlyPrice: number | null;
  displayPrice: string;
  billingLabel: string;
  billingType: 'free' | 'fixed' | 'contact';
  billingIntervals: Array<'monthly'>;
  contactSales: boolean;
  recommended: boolean;
  rank: number;
  features: string[];
  entitlements: string[];
  limits: Record<string, number>;
}

export interface PricingResponse {
  currency: 'INR';
  plans: PublicPlan[];
  provider: 'razorpay' | null;
  checkoutAvailability?: { available: boolean; reason: string | null };
}
export interface PlanSelection { id: string; planKey: PlanKey; sourceTool: string; returnRoute: string; status: string; expiresAt: string }
export interface FeatureGateResult { featureKey: string; allowed: boolean; currentPlanKey: PlanKey; minimumRequiredPlanKey: PlanKey; eligibleUpgradePlans: PublicPlan[]; reason: string }

export interface UpgradeRequest {
  featureKey: string;
  featureName: string;
  sourceTool: string;
  returnRoute: string;
}

export interface CurrentPlanResponse {
  plan: PublicPlan;
  currentPlanKey: PlanKey;
  subscriptionStatus: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: Record<string, boolean>;
  limits: Record<string, number>;
}
