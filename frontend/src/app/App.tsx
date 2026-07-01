import { BrowserRouter } from 'react-router-dom';

import Pattern from '@/shared/assets/pattern.svg';

import { ConnectMqttProvider } from './providers/ConnectMqttProvider';
import { ContextProvider } from './providers/ContextProvider';
import { Router } from './route/router';
import { ThemeProvider } from './providers/ThemeProvider';

import './App.css';

function App() {
    return (
        <ContextProvider>
            <ThemeProvider>
                <BrowserRouter basename="words">
                    <ConnectMqttProvider>
                        <div className="App">
                            <Router />
                        </div>
                    </ConnectMqttProvider>
                </BrowserRouter>
            </ThemeProvider>
        </ContextProvider>
    );
}

export default App;
