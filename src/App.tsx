import { MotionConfig } from 'motion/react'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppLayout />
    </MotionConfig>
  )
}

export default App
