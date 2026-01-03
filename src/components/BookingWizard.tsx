import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Clock, Calendar as CalendarIcon, MapPin, User, CreditCard } from 'lucide-react';
import { format, addMonths, differenceInMonths, isBefore } from 'date-fns';

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
  userProfile: any;
}

interface Seat {
  id: string;
  seat_number: number;
  created_at: string;
}

interface SeatStatus {
  seat_id: string;
  seat_number: number;
  available: boolean;
  waitlisted: boolean;
  occupant?: string;
}

export const BookingWizard = ({
  isOpen,
  onClose,
  onBookingComplete,
  userProfile,
}: BookingWizardProps) => {
  const [step, setStep] = useState(1);
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  // Added '6hr' to the type definition
  const [bookingType, setBookingType] = useState<'6hr' | '12hr' | '24hr'>('12hr');
  // Added new slots to state
  const [slot, setSlot] = useState<'morning' | 'afternoon' | 'evening' | 'day' | 'night' | 'full'>('day');
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatStatuses, setSeatStatuses] = useState<SeatStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset wizard when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFromDate(undefined);
      setToDate(undefined);
      setBookingType('12hr');
      setSlot('day');
      setSelectedSeat('');
      setSeats([]);
      setSeatStatuses([]);
    }
  }, [isOpen]);

  // Fetch seats logic - modified to handle the 3-step or 4-step selection branches
  useEffect(() => {
    const isReadyForSeats = 
      (bookingType === '24hr' && step === 3) || 
      (bookingType !== '24hr' && step === 4);

    if (fromDate && toDate && isReadyForSeats) {
      fetchSeats();
    }
  }, [fromDate, toDate, bookingType, slot, step]);

  const fetchSeats = async () => {
    if (!fromDate || !toDate) return;
    
    setIsLoading(true);
    try {
      const seatFilter = bookingType === '24hr' 
        ? { gte: 1, lte: 13 } 
        : { gte: 14, lte: 50 };

      const { data: seatsData } = await supabase
        .from('seats')
        .select('*')
        .gte('seat_number', seatFilter.gte)
        .lte('seat_number', seatFilter.lte)
        .order('seat_number');

      setSeats(seatsData || []);
      const seatIds = seatsData?.map(s => s.id) || [];
      
      const { data: allBookings } = await supabase
        .from('bookings')
        .select(`
          seat_id,
          slot,
          type,
          start_time,
          end_time,
          users (name)
        `)
        .in('seat_id', seatIds)
        .in('status', ['confirmed', 'pending'])
        .or(`and(start_time.lt.${toDate.toISOString()},end_time.gt.${fromDate.toISOString()})`);

      const { data: allWaitlist } = await supabase
        .from('waitlist')
        .select('seat_id')
        .in('seat_id', seatIds);

      const waitlistMap = new Map();
      allWaitlist?.forEach(entry => {
        waitlistMap.set(entry.seat_id, (waitlistMap.get(entry.seat_id) || 0) + 1);
      });

      const statuses: SeatStatus[] = seatsData?.map(seat => {
        const seatBookings = allBookings?.filter(booking => booking.seat_id === seat.id) || [];
        const waitlistCount = waitlistMap.get(seat.id) || 0;
        
        let hasConflict = false;
        let conflictingOccupant = null;

        for (const booking of seatBookings) {
          if (bookingType === '24hr' || booking.type === '24hr' || booking.slot === 'full') {
            hasConflict = true;
            conflictingOccupant = booking.users?.name;
            break;
          } else {
            // Complex conflict logic for 6hr and 12hr overlaps
            const isOverlap = 
              (slot === booking.slot) || // Exact same slot
              (slot === 'day' && (booking.slot === 'morning' || booking.slot === 'afternoon')) ||
              (booking.slot === 'day' && (slot === 'morning' || slot === 'afternoon')) ||
              (slot === 'night' && booking.slot === 'evening') || // Evening (6pm-12am) overlaps Night (9pm-9am)
              (booking.slot === 'night' && slot === 'evening');

            if (isOverlap) {
              hasConflict = true;
              conflictingOccupant = booking.users?.name;
              break;
            }
          }
        }
        
        return {
          seat_id: seat.id,
          seat_number: seat.seat_number,
          available: !hasConflict,
          waitlisted: waitlistCount > 0,
          occupant: conflictingOccupant,
        };
      }) || [];

      setSeatStatuses(statuses);
    } catch (error) {
      console.error('Error fetching seats:', error);
      toast({ title: 'Error', description: 'Failed to fetch seat availability.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCost = () => {
    if (!fromDate || !toDate) return 0;
    const months = differenceInMonths(toDate, fromDate) + 1;
    const rates = { '24hr': 3800, '12hr': 2300, '6hr': 1500 };
    return months * rates[bookingType];
  };

  const getFormattedDateRange = () => {
    if (!fromDate || !toDate) return '';
    return `${format(fromDate, 'MMM yyyy')} – ${format(toDate, 'MMM yyyy')}`;
  };

  const handleBooking = async () => {
    if (!selectedSeat || !fromDate || !toDate) return;

    setIsLoading(true);
    try {
      const selectedSeatStatus = seatStatuses.find(s => s.seat_id === selectedSeat);
      const finalSlot = bookingType === '24hr' ? 'full' : slot;
      
      if (!selectedSeatStatus?.available) {
        const { error: waitlistError } = await supabase
          .from('waitlist')
          .insert({
            seat_id: selectedSeat,
            user_id: userProfile.id,
            slot: finalSlot,
          });

        if (waitlistError) throw waitlistError;
        toast({ title: 'Added to Waitlist', description: 'You have been added to the waitlist.' });
      } else {
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: userProfile.id,
            seat_id: selectedSeat,
            type: bookingType,
            slot: finalSlot,
            start_time: fromDate.toISOString(),
            end_time: toDate.toISOString(),
            status: 'pending',
            payment_status: 'pending',
            seat_category: 'fixed',
            duration_months: differenceInMonths(toDate, fromDate) + 1,
            monthly_cost: calculateCost() / (differenceInMonths(toDate, fromDate) + 1),
            membership_start_date: fromDate.toISOString().split('T')[0],
            membership_end_date: toDate.toISOString().split('T')[0],
          });

        if (bookingError) throw bookingError;
        toast({ title: 'Request Sent', description: 'Your booking request has been submitted for approval.' });
      }

      onBookingComplete();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({ title: 'Error', description: 'Failed to create booking.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!fromDate || !toDate)) {
      toast({ title: 'Select Dates', description: 'Please select both dates.', variant: 'destructive' });
      return;
    }
    
    if (step === 2) {
      if (bookingType === '24hr') {
        setSlot('full');
        setStep(3); 
        return;
      }
      // Reset slots based on selection
      if (bookingType === '6hr') setSlot('morning');
      else setSlot('day');
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 3 && bookingType === '24hr') setStep(2);
    else setStep(step - 1);
  };

  const getSeatColor = (seatStatus: SeatStatus) => {
    if (!seatStatus.available) return 'bg-seat-occupied text-white';
    if (seatStatus.waitlisted) return 'bg-seat-waitlisted text-black';
    return 'bg-seat-available text-black';
  };

  const totalSteps = bookingType === '24hr' ? 4 : 5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Book a Seat - Step {step} of {totalSteps}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Date Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> Select Period</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">From Date</Label>
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      if (!fromDate && date) {
                        setToDate(addMonths(date, 1));
                      }
                    }}
                    disabled={(date) => isBefore(date, new Date())}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">To Date</Label>
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={(date) => !fromDate || isBefore(date, fromDate)}
                    className="rounded-md border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Booking Type */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Membership Type</h3>
              <RadioGroup value={bookingType} onValueChange={(v: any) => setBookingType(v)}>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4 flex items-center space-x-2">
                    <RadioGroupItem value="6hr" id="6hr" />
                    <Label htmlFor="6hr" className="flex-1 cursor-pointer">
                      <div className="font-medium">Limited Hours (6 Hours)</div>
                      <div className="text-sm text-muted-foreground">Morning, Afternoon, or Evening • ₹1,500/month</div>
                    </Label>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4 flex items-center space-x-2">
                    <RadioGroupItem value="12hr" id="12hr" />
                    <Label htmlFor="12hr" className="flex-1 cursor-pointer">
                      <div className="font-medium">12 Hour Booking</div>
                      <div className="text-sm text-muted-foreground">Day or Night slot • Seats 14-50 • ₹2,300/month</div>
                    </Label>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4 flex items-center space-x-2">
                    <RadioGroupItem value="24hr" id="24hr" />
                    <Label htmlFor="24hr" className="flex-1 cursor-pointer">
                      <div className="font-medium">24 Hour Booking</div>
                      <div className="text-sm text-muted-foreground">Full day access • Seats 1-13 • ₹3,800/month</div>
                    </Label>
                  </CardContent>
                </Card>
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Slot Selection (for 6hr and 12hr) */}
          {step === 3 && bookingType !== '24hr' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Time Slot</h3>
              <RadioGroup value={slot} onValueChange={(v: any) => setSlot(v)}>
                {bookingType === '12hr' ? (
                  <>
                    <SlotOption id="day" label="Day Slot" time="9:00 AM - 9:00 PM" />
                    <SlotOption id="night" label="Night Slot" time="9:00 PM - 9:00 AM" />
                  </>
                ) : (
                  <>
                    <SlotOption id="morning" label="Morning Slot" time="6:00 AM - 12:00 PM" />
                    <SlotOption id="afternoon" label="Afternoon Slot" time="12:00 PM - 6:00 PM" />
                    <SlotOption id="evening" label="Evening Slot" time="6:00 PM - 12:00 AM" />
                  </>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Seat Selection Step */}
          {((step === 3 && bookingType === '24hr') || (step === 4 && bookingType !== '24hr')) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Seat</h3>
              {isLoading ? (
                <div className="text-center py-8">Loading available seats...</div>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-2">
                    {seatStatuses.map((ss) => (
                      <Button
                        key={ss.seat_id}
                        variant={selectedSeat === ss.seat_id ? 'default' : 'outline'}
                        className={`h-12 text-sm ${selectedSeat === ss.seat_id ? 'ring-2 ring-primary' : getSeatColor(ss)}`}
                        onClick={() => setSelectedSeat(ss.seat_id)}
                      >
                        {ss.seat_number}
                      </Button>
                    ))}
                  </div>
                  {selectedSeat && <SeatSummary seatStatuses={seatStatuses} selectedSeat={selectedSeat} />}
                </>
              )}
            </div>
          )}

          {/* Final Step: Summary */}
          {step === totalSteps && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5" /> Final Confirmation</h3>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <SummaryRow label="Full Name" value={userProfile.name} />
                  <SummaryRow label="Period" value={getFormattedDateRange()} />
                  <SummaryRow label="Seat" value={seatStatuses.find(s => s.seat_id === selectedSeat)?.seat_number} />
                  <SummaryRow label="Type" value={`${bookingType === '6hr' ? '6 Hour' : bookingType === '12hr' ? '12 Hour' : '24 Hour'} (${slot})`} />
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Cost:</span>
                    <span>₹{calculateCost().toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}><ArrowLeft className="h-4 w-4 mr-2" /> Previous</Button>
            {step === totalSteps ? (
              <Button onClick={handleBooking} disabled={!selectedSeat || isLoading}>{isLoading ? 'Submitting...' : 'Send Request'}</Button>
            ) : (
              <Button onClick={nextStep} disabled={isLoading}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper Components for Cleanliness
const SlotOption = ({ id, label, time }: { id: string; label: string; time: string }) => (
  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
    <CardContent className="pt-4 flex items-center space-x-2">
      <RadioGroupItem value={id} id={id} />
      <Label htmlFor={id} className="flex-1 cursor-pointer">
        <div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> {label}</div>
        <div className="text-sm text-muted-foreground">{time}</div>
      </Label>
    </CardContent>
  </Card>
);

const SummaryRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium">{value}</span>
  </div>
);

const SeatSummary = ({ seatStatuses, selectedSeat }: { seatStatuses: SeatStatus[], selectedSeat: string }) => {
  const s = seatStatuses.find(stat => stat.seat_id === selectedSeat);
  return (
    <Card className="mt-4">
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between"><span>Seat:</span><span className="font-bold">{s?.seat_number}</span></div>
        <div className="flex justify-between">
          <span>Status:</span>
          <Badge variant={s?.available ? 'default' : 'secondary'}>{s?.available ? 'Available' : 'Waitlist'}</Badge>
        </div>
        {s?.occupant && <div className="flex justify-between"><span>Current:</span><span className="text-sm">{s.occupant}</span></div>}
      </CardContent>
    </Card>
  );
};
