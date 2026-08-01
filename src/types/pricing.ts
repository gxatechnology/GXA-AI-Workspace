export type PlanKey = 'free' | 'pro' | 'pro_plus' | 'business-pro' | 'team' | 'enterprise';

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
  active: boolean;
  public: boolean;
  upgradeable: boolean;
  recommended: boolean;
  rank: number;
  features: string[];
  entitlements: string[];
  limits: Record<string, number>;
}

export interface PricingResponse {
  currency: 'INR';
  plans: PublicPlan[];
  comparison: PlanComparison;
  provider: 'razorpay' | null;
  checkoutAvailability?: { available: boolean; reason: string | null };
}
export type ComparisonValueKind = 'included' | 'excluded' | 'limit' | 'text' | 'planned';
export interface PlanComparisonValue { kind: ComparisonValueKind; label: string }
export interface PlanComparisonRow { id: string; label: string; description?: string; values: Partial<Record<PlanKey, PlanComparisonValue>> }
export interface PlanComparisonSection { id: string; label: string; rows: PlanComparisonRow[] }
export interface PlanComparison { generatedFrom: string[]; sections: PlanComparisonSection[] }
export interface PlanSelection { id: string; planKey: PlanKey; sourceTool: string; returnRoute: string; status: string; expiresAt: string }
export interface FeatureGateResult {
  featureKey: string;
  allowed: boolean;
  currentPlanKey: PlanKey;
  currentPlan: PublicPlan;
  minimumRequiredPlanKey: PlanKey;
  eligibleUpgradePlans: PublicPlan[];
  presentation: { heading: string; description: string; benefits: string[] } | null;
  reason: string;
}

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
