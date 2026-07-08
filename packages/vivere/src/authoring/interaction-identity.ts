export interface InteractionMember {
  roles: string[]
  permissions: string[]
}

export interface InteractionIdentity {
  userId: string
  guildId?: string
  locale?: string
  member?: InteractionMember
}
