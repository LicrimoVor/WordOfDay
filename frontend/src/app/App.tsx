import { BrowserRouter } from 'react-router-dom';

import { Router } from './route/router';

import './App.css';

function App() {
    const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

    return (
        <BrowserRouter basename={basename}>
            <div className="App">
                <Router />
            </div>
        </BrowserRouter>
    );
}

export default App;
