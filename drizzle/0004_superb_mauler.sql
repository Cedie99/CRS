CREATE INDEX "cis_status_created_at_idx" ON "cis_submissions" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cis_customer_type_idx" ON "cis_submissions" USING btree ("customer_type");--> statement-breakpoint
CREATE INDEX "workflow_events_actor_action_idx" ON "workflow_events" USING btree ("actor_id","action");