import BankAccountDetail from './pages/BankAccountDetail';
import CardDetail from './pages/CardDetail';
import LoanDetail from './pages/LoanDetail';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BankAccountDetail": BankAccountDetail,
    "CardDetail": CardDetail,
    "LoanDetail": LoanDetail,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};