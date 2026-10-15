import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { FriendshipSlider } from './FriendshipSlider'

afterEach(cleanup)

it('updates friendship through the slider and presents both endpoint hearts', () => {
  function Show() {
    const [friendship, setFriendship] = useState(255)
    return <FriendshipSlider label="Friendship" value={friendship} onChange={setFriendship} />
  }

  const { container } = render(<Show />)
  const slider = screen.getByRole('slider', { name: 'Friendship' })

  expect(slider).toHaveValue('255')
  expect(container.querySelector('.friendship-heart-min')).toBeInTheDocument()
  expect(container.querySelector('.friendship-heart-max')).toBeInTheDocument()

  fireEvent.change(slider, { target: { value: '120' } })

  expect(slider).toHaveValue('120')
  expect(screen.getByText('120')).toBeInTheDocument()
})
