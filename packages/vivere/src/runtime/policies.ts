import type { MiddlewareContext } from '../authoring/middleware.js'
import type { PolicyDefinition, PolicyTarget } from '../authoring/policies.js'

export async function enforcePolicies(
  ctx: MiddlewareContext,
  policies: readonly PolicyDefinition[],
  target: PolicyTarget,
): Promise<void> {
  for (const policy of policies) {
    await policy.enforce(ctx, target)
  }
}
