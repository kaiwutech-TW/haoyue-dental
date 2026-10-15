## A helpful reply. A confirmed action.

A helpful reply should lead to a correct appointment. Meet How Yue: a patient dental concierge for Taiwan. It connects everyday language with decisions you can inspect, and changes you must confirm.

## Free text → real NVIDIA decision

This is the live English demo. Choose a fictional patient and type: not cancel, please reschedule my appointment. Our fine-tuned NVIDIA four-billion-parameter model scores eight intents in one forward pass. The panel shows the actual adapter, scores, and processing events. Buttons are simply shortcuts to the same text pipeline.

## Review → confirm → atomic commit

The model cannot change a booking by itself. Application rules check patient ownership, dates, doctors, availability, and versions. Select a time, review the proposal, and confirm. Only then does an atomic transaction update the appointment. Read back the saved result. If a slot is taken or a confirmation is stale, the original appointment is preserved.

## Patient guidance, without profiling

People sometimes click by mistake. Explicit confusion gets patient, step-by-step guidance. Repeating the same request keeps the pending choice and skips another model call. We do not guess a person’s age. Supportive language uses transparent rules, not a trained emotion classifier.

## A real handoff case

A request for a person opens a real handoff case. The assistant does not pretend that a staff member has replied. Symptoms and family bookings also follow conservative handoff rules. All patients here are synthetic.

## NVIDIA • Nebius • Tavily • Supabase

Below a score of zero point eight five, or when local inference is unavailable, NVIDIA Nano thirty B on Nebius Token Factory provides budgeted fallback. Supabase commits the transaction. Tavily supports staff research, with human approval before knowledge is used. The app and database run in Tokyo.

## Measured improvements. Visible limits.

We trained the adapter on an NVIDIA L four. On a fixed sixty-four-item synthetic test, the base scored fifty-two correct and the adapter fifty-eight. One accepted high-score prediction was still wrong. The warmed local median was fifty-three milliseconds, excluding network and database time. These are engineering measurements, not clinical validation.

## Understand. Confirm. Complete.

The primary training language is Taiwanese Mandarin. English is interactive too, with separately documented smoke tests. The code, adapter, full training recipe, failures, and costs are public. How Yue: understand, confirm, complete. Try the live demo.
