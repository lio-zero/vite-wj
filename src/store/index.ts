import type { ProjectConfig } from '#/config'
import { createStore } from 'vuex'
import getters from './getters'
import Cookies from 'js-cookie'
import {
  getToken,
  // setToken,
  // setRefreshToken,
  // getRefreshToken,
  // removeToken,
  setAuthCache
} from '@/utils/auth'
import { USER_INFO_KEY, TOKEN_KEY } from '@/enums/cacheEnum'
import { PageEnum } from '@/enums/pageEnum'
import { login, getUserInfo, doLogout } from '@/api/login'
// import { isArray } from '@/utils/is'
// import jwtDecode from 'jwt-decode'
import { router } from '@/router'
import { Persistent } from '@/utils/cache/persistent'
import { PROJ_CFG_KEY } from '@/enums/cacheEnum'
import { deepMerge } from '@/utils'

let timeId: TimeoutHandle

export default createStore({
  state: {
    sidebar: {
      opened: Cookies.get('sidebarStatus') ? !!+Cookies.get('sidebarStatus') : true,
      withoutAnimation: false
    },
    app: {
      device: 'desktop'
    },
    size: Cookies.get('size') || 'medium',
    userInfo: '',
    lastUpdateTime: 0,
    // 登录是否过期
    sessionTimeout: false,
    addRoutes: [],
    token: null,
    roles: '',
    pageLoading: false,
    setting: {
      showLogo: false
    },
    projectConfig: Persistent.getLocal(PROJ_CFG_KEY)
  },
  getters,
  mutations: {
    TOGGLE_SIDEBAR: (state: any) => {
      state.sidebar.opened = !state.sidebar.opened
      state.sidebar.withoutAnimation = false
      if (state.sidebar.opened) {
        Cookies.set('sidebarStatus', 1)
      } else {
        Cookies.set('sidebarStatus', 0)
      }
    },
    CLOSE_SIDEBAR: (state: any, withoutAnimation: any) => {
      Cookies.set('sidebarStatus', 0)
      state.sidebar.opened = false
      state.sidebar.withoutAnimation = withoutAnimation
    },
    TOGGLE_DEVICE: (state: any, device: any) => {
      state.device = device
    },
    SET_SIZE: (state: any, size: any) => {
      state.size = size
      Cookies.set('size', size)
    }
  },
  actions: {
    setToken({ state }, info) {
      state.token = info ? info : ''
      setAuthCache(TOKEN_KEY, info)
    },
    setUserInfo({ state }, info) {
      state.userInfo = info
      state.lastUpdateTime = new Date().getTime()
      setAuthCache(USER_INFO_KEY, info)
    },
    setSessionTimeout({ state }, flag) {
      state.sessionTimeout = flag
    },
    resetState({ state }) {
      state.userInfo = null
      state.token = ''
      state.sessionTimeout = false
    },
    async login({ dispatch }, userInfo: any) {
      try {
        const { token }: any = await login(userInfo)
        dispatch('setToken', token)
        return dispatch('afterLoginAction')
      } catch (error) {
        return Promise.reject(error)
      }
    },
    async afterLoginAction({ dispatch, state }: any) {
      if (!getToken) return null
      const userInfo = await dispatch('getUserInfoAction')
      const sessionTimeout = state.sessionTimeout
      if (sessionTimeout) {
        dispatch('sessionTimeout', false)
      }

      return userInfo

      // const { id }: any = jwtDecode(state.token)
      // const data = await getUserInfo(id)
      // if (!data) return '验证失败，请重新登录。'
      // return data
    },
    async getUserInfoAction({ dispatch }) {
      if (!getToken) return null
      const userInfo = await getUserInfo()
      dispatch('setUserInfo', userInfo)
      return userInfo
    },
    async logout({ dispatch, state }, goLogin = false) {
      if (state.getToken) {
        try {
          await doLogout()
        } catch {
          console.log('注销 Token 失败')
        }
      }
      dispatch('setToken', undefined)
      dispatch('setSessionTimeout', false)
      dispatch('setUserInfo', null)
      goLogin && router.push(PageEnum.BASE_LOGIN)
      // const { id } = jwtDecode(state.token)
      // const data = await logout(id)
      // commit('SET_TOKEN', '')
      // removeToken('Admin-Token')
      // removeToken('Refresh-Token')
    },
    // 刷新 token
    // async refreshToken({ commit }: any) {
    //   const token = await getNewToken({ token: getRefreshToken() })
    //   commit('SET_TOKEN', token)
    //   setToken(token)
    // },
    toggleSideBar({ commit }: any) {
      commit('TOGGLE_SIDEBAR')
    },
    closeSideBar({ commit }: any, { withoutAnimation }: any) {
      commit('CLOSE_SIDEBAR', withoutAnimation)
    },
    toggleDevice({ commit }: any, device: any) {
      commit('TOGGLE_DEVICE', device)
    },
    setSize({ commit }: any, size: any) {
      commit('SET_SIZE', size)
    },
    setPageLoading({ state }, loading: boolean): void {
      state.pageLoading = loading
    },
    async setPageLoadingAction({ dispatch }, loading: boolean): Promise<void> {
      if (loading) {
        clearTimeout(timeId)
        // 防止闪烁
        timeId = setTimeout(() => {
          dispatch('setPageLoading', loading)
        }, 50)
      } else {
        dispatch('setPageLoading', loading)
        clearTimeout(timeId)
      }
    },
    setProjectConfig({ state }, config: DeepPartial<ProjectConfig>): void {
      state.projectConfig = deepMerge(state.projectConfig || {}, config)
      Persistent.setLocal(PROJ_CFG_KEY, state.projectConfig)
    }
  },
  modules: {}
})
