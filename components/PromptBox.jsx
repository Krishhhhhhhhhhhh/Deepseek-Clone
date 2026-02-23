import React from 'react'
import Image from 'next/image'
import { assets } from '../assets/assets'
const PromptBox = () => {
  return (
    <form  className={`w-full ${false?"max-w-3xl":"max-w-2xl"} bg-[#404045] p-4 rounded-3xl mt-4 transition-all`}>
        <textarea className='outline-none w-full resize-none overflow-hidden break-words bg-transparent' rows={2} placeholder='Message DeepSeek' required/>

        <div>
            <div>
                <p className=''>
                    <Image src={assets.deepthink_icon} alt='' className='h-5'/>
                    DeepThink (R1)
                </p>
            </div>
        </div>

    </form>
  )
}

export default PromptBox
