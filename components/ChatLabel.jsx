import React, { useState } from 'react'
import Image from 'next/image'
import { assets } from '../assets/assets'

const ChatLabel = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className='flex items-center justify-between p-2 text-white/80 hover:bg-white/10 rounded-lg text-sm group cursor-pointer relative'>
      <p className='group-hover:max-w-5/6 truncate'>Chat Name Here</p>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className='flex items-center justify-center h-6 w-6 aspect-square hover:bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
      >
        <Image src={assets.three_dots} className='w-4' alt='More options' />
      </button>
      {isMenuOpen && (
        <div onMouseLeave={() => setIsMenuOpen(false)} className='absolute -right-36 top-6 bg-gray-700 rounded-xl w-max p-2 z-20'>
          <button className='flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg w-full text-left'>
            <Image src={assets.pencil_icon} className='w-4' alt='Rename chat' />
            <p>Rename</p>
          </button>
          <button className='flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg w-full text-left'>
            <Image src={assets.delete_icon} className='w-4' alt='Delete chat' />
            <p>Delete</p>
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatLabel
