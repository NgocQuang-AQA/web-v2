import { Link } from 'react-router-dom'
import notFoundImg from '../assets/404-page.png'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <img
        src={notFoundImg}
        alt="404 Not Found"
        className="max-w-md w-full mb-8"
      />
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h1>
      <p className="text-gray-600 mb-8">
        The page you are looking for does not exist or you do not have
        permission to view it.
      </p>
      <Link to="http://10.13.60.71:5173/" className="btn btn-primary">
        Go Home
      </Link>
    </div>
  )
}
