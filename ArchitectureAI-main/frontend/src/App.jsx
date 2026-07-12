import { createContext, useContext } from 'react'
import { dark } from './theme.js'

export const ThemeCtx = createContext(dark)
export const useTheme = () => useContext(ThemeCtx)
