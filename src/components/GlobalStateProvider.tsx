import { useMachine } from '@xstate/react'
import { useNavigate } from 'react-router-dom'
import { paths } from '../Router'
import {
  authCommandBarMeta,
  authMachine,
  TOKEN_PERSIST_KEY,
} from '../machines/authMachine'
import withBaseUrl from '../lib/withBaseURL'
import React, { createContext, useEffect, useRef } from 'react'
import useStateMachineCommands from '../hooks/useStateMachineCommands'
import {
  SETTINGS_PERSIST_KEY,
  settingsCommandBarMeta,
  settingsMachine,
} from 'machines/settingsMachine'
import { toast } from 'react-hot-toast'
import { setThemeClass, Themes } from 'lib/theme'
import {
  AnyStateMachine,
  ContextFrom,
  InterpreterFrom,
  Prop,
  StateFrom,
} from 'xstate'
import { useCommandsContext } from 'hooks/useCommandsContext'
import { isTauri } from 'lib/isTauri'

type MachineContext<T extends AnyStateMachine> = {
  state: StateFrom<T>
  context: ContextFrom<T>
  send: Prop<InterpreterFrom<T>, 'send'>
}

type GlobalContext = {
  auth: MachineContext<typeof authMachine>
  settings: MachineContext<typeof settingsMachine>
}

export const GlobalStateContext = createContext({} as GlobalContext)

export const GlobalStateProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const navigate = useNavigate()
  const { commands } = useCommandsContext()

  // Settings machine setup
  const retrievedSettings = useRef(
    localStorage?.getItem(SETTINGS_PERSIST_KEY) || '{}'
  )
  const persistedSettings = Object.assign(
    settingsMachine.initialState.context,
    JSON.parse(retrievedSettings.current) as Partial<
      (typeof settingsMachine)['context']
    >
  )

  const [settingsState, settingsSend] = useMachine(settingsMachine, {
    context: persistedSettings,
    actions: {
      toastSuccess: (context, event) => {
        const truncatedNewValue =
          'data' in event && event.data instanceof Object
            ? (context[Object.keys(event.data)[0] as keyof typeof context]
                .toString()
                .substring(0, 28) as any)
            : undefined
        toast.success(
          event.type +
            (truncatedNewValue
              ? ` to "${truncatedNewValue}${
                  truncatedNewValue.length === 28 ? '...' : ''
                }"`
              : '')
        )
      },
    },
  })

  useStateMachineCommands({
    state: settingsState,
    send: settingsSend,
    commands,
    owner: 'settings',
    commandBarMeta: settingsCommandBarMeta,
  })

  // Listen for changes to the system theme and update the app theme accordingly
  // This is only done if the theme setting is set to 'system'.
  // It can't be done in XState (in an invoked callback, for example)
  // because there doesn't seem to be a good way to listen to
  // events outside of the machine that also depend on the machine's context
  useEffect(() => {
    const matcher = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      if (settingsState.context.theme !== 'system') return
      setThemeClass(e.matches ? Themes.Dark : Themes.Light)
    }

    matcher.addEventListener('change', listener)
    return () => matcher.removeEventListener('change', listener)
  }, [settingsState.context])

  // Auth machine setup
  const [authState, authSend] = useMachine(authMachine, {
    actions: {
      goToSignInPage: () => {
        navigate(paths.SIGN_IN)

        logout()
      },
      goToIndexPage: () => {
        if (window.location.pathname.includes(paths.SIGN_IN)) {
          navigate(paths.INDEX)
        }
      },
    },
  })

  useStateMachineCommands({
    state: authState,
    send: authSend,
    commands,
    commandBarMeta: authCommandBarMeta,
    owner: 'auth',
  })

  return (
    <GlobalStateContext.Provider
      value={{
        auth: {
          state: authState,
          context: authState.context,
          send: authSend,
        },
        settings: {
          state: settingsState,
          context: settingsState.context,
          send: settingsSend,
        },
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  )
}

export default GlobalStateProvider

export function logout() {
  localStorage.removeItem(TOKEN_PERSIST_KEY)
  return (
    !isTauri() &&
    fetch(withBaseUrl('/logout'), {
      method: 'POST',
      credentials: 'include',
    })
  )
}
