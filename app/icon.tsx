import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 24,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5A623',
          borderRadius: '50%',
          color: 'white',
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          fontSize: 16,
        }}
      >
        1
      </div>
    </div>,
    { ...size }
  )
}
