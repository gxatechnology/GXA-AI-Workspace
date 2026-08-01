import React from "react";
import BillingOverview from "./BillingOverview";
import Payments from "./BillingPayments";
import Subscriptions from "./BillingSubscriptions";
import { PaymentDetail, SubscriptionDetail } from "./BillingDetails";

type Section =
  "billing" | "payments" | "payment" | "subscriptions" | "subscription";

interface Props {
  section: Section;
  recordId: string;
  currentUser: any;
  navigate: (path: string) => void;
}

export default function BillingAdmin({
  section,
  recordId,
  currentUser,
  navigate,
}: Props) {
  if (section === "billing")
    return <BillingOverview user={currentUser} navigate={navigate} />;
  if (section === "payments")
    return <Payments user={currentUser} navigate={navigate} />;
  if (section === "payment")
    return (
      <PaymentDetail user={currentUser} id={recordId} navigate={navigate} />
    );
  if (section === "subscriptions")
    return <Subscriptions user={currentUser} navigate={navigate} />;
  return (
    <SubscriptionDetail user={currentUser} id={recordId} navigate={navigate} />
  );
}
