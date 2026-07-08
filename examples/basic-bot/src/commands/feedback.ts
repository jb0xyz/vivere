import { defineCommand } from '../app/vivere.js'
import feedbackModal from '../components/feedback.js'

export default defineCommand({
  name: 'feedback',
  description: '피드백 모달을 엽니다',
  async execute(ctx) {
    await ctx.showModal(feedbackModal, {
      params: { userId: '123456789012345678' },
      title: '피드백',
    })
  },
})
