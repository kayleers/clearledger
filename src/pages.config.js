import Dashboard from './pages/Dashboard';
import CardDetail from './pages/CardDetail';
import LoanDetail from './pages/LoanDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "CardDetail": CardDetail,
    "LoanDetail": LoanDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};