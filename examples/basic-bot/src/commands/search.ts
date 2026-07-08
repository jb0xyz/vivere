import { defineCommand, opt } from '../app/vivere.js'

const choiceList = [
  { name: 'Apple', value: 'apple' },
  { name: 'Banana', value: 'banana' },
  { name: 'Cherry', value: 'cherry' },
]

export default defineCommand({
  name: 'search',
  description: '항목을 검색합니다',
  options: {
    query: opt.string('검색어').autocomplete((_ctx, value) =>
      choiceList.filter((choice) => choice.name.toLowerCase().includes(value.toLowerCase())).slice(0, 25),
    ),
  },
  async execute(ctx) {
    await ctx.reply(`검색: ${ctx.options.query}`)
  },
})
