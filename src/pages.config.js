import CardDetail from './pages/CardDetail';
import Dashboard from './pages/Dashboard';
import LoanDetail from './pages/LoanDetail';
import BankAccountDetail from './pages/BankAccountDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CardDetail": CardDetail,
    "Dashboard": Dashboard,
    "LoanDetail": LoanDetail,
    "BankAccountDetail": BankAccountDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};