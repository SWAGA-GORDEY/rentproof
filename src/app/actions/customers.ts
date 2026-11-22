"use server";

import { redirect } from "next/navigation";
import { assertFeatureAllowed } from "@/lib/bans";
import { requireUser } from "@/lib/current-user";
import { FeatureBlockedError, PlanLimitError } from "@/lib/errors";
import {
  addCustomerInteraction,
  archiveCustomer,
  createCustomer,
  updateCustomer,
} from "@/lib/customers";

function readCustomerFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  return {
    name,
    email: emailRaw || null,
    phone: phoneRaw || null,
    notes: notesRaw || null,
  };
}

export async function createCustomerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/verify-email");
  try {
    assertFeatureAllowed(user.id, "crm");
  } catch (error) {
    if (error instanceof FeatureBlockedError) {
      redirect("/account/customers?error=blocked");
    }
    throw error;
  }
  const input = readCustomerFields(formData);
  if (input.name.length < 2) {
    redirect("/account/customers?error=name");
  }
  try {
    const id = createCustomer(user.id, input);
    redirect(`/account/customers/${id}`);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      redirect("/account/customers?error=limit");
    }
    redirect("/account/customers?error=save");
  }
}

export async function updateCustomerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("customerId") ?? "");
  const input = readCustomerFields(formData);
  updateCustomer(user.id, id, input);
  redirect(`/account/customers/${id}?ok=1`);
}

export async function archiveCustomerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("customerId") ?? "");
  archiveCustomer(user.id, id);
  redirect("/account/customers");
}

export async function addCustomerNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("customerId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (body) {
    addCustomerInteraction(user.id, id, "note", body);
  }
  redirect(`/account/customers/${id}`);
}
