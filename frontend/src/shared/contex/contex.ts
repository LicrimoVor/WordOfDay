import { Theme } from "@gravity-ui/uikit";
import { MqttClient } from "mqtt/*";
import { Reducer, createContext, Dispatch, useContext } from "react";

export interface GlobalState {
  client?: MqttClient;
  statusMqtt?: "connecting" | "ready" | "reconnecting" | "error";
  theme?: Theme;
}

export const GlobalContext = createContext({
  state: {},
  dispatch: (value: Action) => {},
});

type IActionType = "createClient" | "changeStatus" | "changeTheme";

interface Action {
  type: IActionType;
  payload?: any;
}

export const globalReducer: Reducer<GlobalState, Action> = (state, action) => {
  switch (action.type) {
    case "createClient": {
      console.log("connected");
      return {
        ...state,
        client: action.payload,
        statusMqtt: "ready",
      };
    }
    case "changeStatus": {
      return {
        ...state,
        statusMqtt: action.payload,
      };
    }
    case "changeTheme": {
      localStorage.setItem("theme", action.payload);
      return {
        ...state,
        theme: action.payload,
      };
    }
    default: {
      throw Error("Хз че за актион");
    }
  }
};

export const useGlobalContext = () =>
  useContext<{ state: GlobalState; dispatch: Dispatch<Action> }>(GlobalContext);
