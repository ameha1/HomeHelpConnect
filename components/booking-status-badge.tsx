import { Badge } from "@/components/ui/badge";

interface BookingStatusBadgeProps {
    status: 'pending' | 'confirmed' | 'awaiting_homeowner_confirmation' | 'completed' | 'cancelled';
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
    const statusStyles = {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        awaiting_homeowner_confirmation: 'bg-purple-100 text-purple-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const statusText = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        awaiting_homeowner_confirmation: 'Awaiting Confirmation',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };

    return (
        <Badge className={`${statusStyles[status]} font-medium`}>
            {statusText[status]}
        </Badge>
    );
}