import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Users, MapPin, Clock, IndianRupee, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';



interface NewMembershipBookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
  userProfile: any;
}

interface SeatAvailability {
  is_available: boolean;
  next_available_date: string | null;
  conflicting_booking_end: string | null;
}

export default function NewMembershipBookingWizard({
  isOpen,
  onClose,
  onBookingComplete,
  userProfile,
}: NewMembershipBookingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<'fixed' | 'floating' | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedSeat(null);
      setDuration(1);
      setSeatAvailability(null);
    }
  }, [isOpen]);

  const calculateMonthlyCost = () => {
    return selectedCategory === 'fixed' ? 3500 : 2200;
  };

  const calculateTotalCost = () => {
    return calculateMonthlyCost() * duration;
  };

const checkSeatAvailability = async (seatNumber: number) => {
  setIsLoading(true);
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    const { data, error } = await supabase.rpc('check_seat_availability', {
      seat_number_param: seatNumber,
      start_date_param: startDate.toISOString().split('T')[0],
      end_date_param: endDate.toISOString().split('T')[0],
    });

    if (error) throw error;

    
    setSeatAvailability(data[0]);
  } catch (error) {
    console.error('Error checking seat availability:', error);
    toast({
      title: "Error",
      description: "Failed to check seat availability",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const [copied, setCopied] = useState(false);

  const handleSeatSelection = async () => {
    if (!selectedSeat) return;
    await checkSeatAvailability(selectedSeat);
  };

  const handleBooking = async () => {
  if (!userProfile || !selectedCategory) return;

  setIsLoading(true);
  try {
    // Use the correct start date
    let startDate: Date;
    if (selectedCategory === 'fixed' && seatAvailability?.next_available_date) {
      startDate = new Date(seatAvailability.next_available_date);
    } else {
      startDate = new Date(); // fallback for floating
    }

    // Calculate end date based on duration
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    let seatId = null;
    if (selectedCategory === 'fixed' && selectedSeat) {
      const { data: seatData } = await supabase
        .from('seats')
        .select('id')
        .eq('seat_number', selectedSeat)
        .single();
      seatId = seatData?.id;
    }

    const bookingData = {
      user_id: userProfile.id,
      seat_id: seatId,
      seat_category: selectedCategory,
      duration_months: duration,
      monthly_cost: calculateMonthlyCost(),
      membership_start_date: startDate.toISOString().split('T')[0],
      membership_end_date: endDate.toISOString().split('T')[0],
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      type: 'membership',
      status: 'pending',
      payment_status: 'pending',
      description: `${selectedCategory === 'fixed' ? 'Fixed' : 'Floating'} seat membership for ${duration} month${duration > 1 ? 's' : ''}`,
    };

    const { error } = await supabase.from('bookings').insert(bookingData);

    if (error) throw error;

    // Set a success message in the wizard itself (instead of toaster)
    setStep(5); // move to confirmation step

  } catch (error) {
    console.error('Error creating booking:', error);
    toast({
      title: "Error",
      description: "Failed to submit booking request",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};




// Step Navigation
const nextStep = async () => {
  if (step === 1 && selectedCategory === "fixed") {
    setStep(2);
  }else if (step === 1 && selectedCategory === "floating") {
    console.log("step3")
    setStep(3);
  } else if (step === 2 && selectedCategory === "fixed") {
    setStep(3); // seat selection done, go to duration
  } else if (step === 3) {
    setStep(4); // duration done, go to summary
  } else if (step === 4) {
    setStep(5); // fixed final success
  }
};


const prevStep = () => {
  if (step > 1) setStep(step - 1);
};

  
  const [allSeats] = useState<number[]>(Array.from({ length: 50 }, (_, i) => i + 1));
  const [bookings, setBookings] = useState<any[]>([]);
  const [seatStatus, setSeatStatus] = useState<any[]>([]);
 
    useEffect(() => {
      const fetchBookings = async () => {
        const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
      .from('bookings')
      .select(`
        seat_id,
        seats!inner(seat_number),
        membership_start_date,
        membership_end_date,
        status
      `)
      .in('status', ['confirmed', 'approved']);


        if (error) {
          console.error("Error fetching bookings:", error);
        } else {
          
          setBookings(data || []);
        }
      };

      fetchBookings();
    }, []);

  useEffect(() => {
  const today = new Date();

  const status = allSeats.map(seat => {
    // Find booking for this seat
    const booking = bookings.find(b => b.seats?.seat_number === seat);

    if (!booking) {
      return {
        seatNumber: seat,
        available: true,
        nextAvailable: null,
      };
    }

    const start = new Date(booking.membership_start_date);
    const end = new Date(booking.membership_end_date);

    return {
      seatNumber: seat,
      available: today < start || today > end, // true if not within booking period
      nextAvailable: today >= start && today <= end ? booking.membership_end_date : null,
    };
  });

    setSeatStatus(status);
  }, [bookings, allSeats]);

  useEffect(() => {
    const today = new Date();

    const status = allSeats.map(seat => {
      // Find active booking for this seat
      const booking = bookings.find(b => {
        const start = new Date(b.membership_start_date);
        const end = new Date(b.membership_end_date);
        return b.seats?.seat_number === seat && start <= today && today <= end;
      });

      if (!booking) {
        return {
          seatNumber: seat,
          available: true,
          nextAvailable: null,
        };
      }

      // Format end date as "23 Jan 2025"
      const endDate = new Date(booking.membership_end_date);
      const formattedDate = endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      return {
        seatNumber: seat,
        available: false,
        nextAvailable: formattedDate,
      };
    });

      setSeatStatus(status);
    }, [bookings, allSeats]);



  // Calculate membership duration based on seat availability
  let startDate: Date;
  let endDate: Date;

  if (seatAvailability?.next_available_date) {
    startDate = new Date(seatAvailability.next_available_date);
  } else {
    startDate = new Date(); // fallback if no availability info
  }

  endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + duration);


// Steps total
const totalSteps = selectedCategory === "floating" ? 4 : 5;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Membership Booking - Step {step} of {totalSteps}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  (selectedCategory === 'floating' && i === 3) && "hidden"
                )}
              >
                {i}
              </div>
            ))}
          </div>

          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Choose Your Membership</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg border-2 group",
                    selectedCategory === 'fixed' ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedCategory('fixed')}
                >
                  <CardHeader className="text-center">
                    <Crown className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <CardTitle className="text-2xl">Fixed Seat</CardTitle>
                    <CardDescription className="text-base">Premium membership with dedicated seat</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">₹3,300</span>
                      <span className="text-lg text-muted-foreground">/month</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Dedicated seat number (1-50)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Personal locker included</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>24×7 access</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg border-2 group",
                    selectedCategory === 'floating' ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedCategory('floating')}
                >
                  <CardHeader className="text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <CardTitle className="text-2xl">Floating Seat</CardTitle>
                    <CardDescription className="text-base">Flexible membership with any available seat</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">₹2,200</span>
                      <span className="text-lg text-muted-foreground">/month</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Any available seat (1-50)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>24×7 access</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <span>No personal locker</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Seat Selection for Fixed OR Note for Floating */}
          {step === 2 && selectedCategory === 'fixed' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center">Select Your Seat Number</h3>
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-3">
              <Label htmlFor="seat" className="text-base font-semibold">Seat Number (1-50)</Label>
              <select
    id="seat"
    value={selectedSeat || ''}
    onChange={(e) => setSelectedSeat(parseInt(e.target.value))}
    className="text-center text-lg h-12 w-full border rounded-md px-2"
  >
    {seatStatus.map(s => (
      <option key={s.seatNumber} value={s.seatNumber}>
       {`Seat ${s.seatNumber} ${s.available ? '(Available Now)' : `(Available from ${s.nextAvailable})`}`}

      </option>
    ))}
  </select>



            
                </div>
              
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-primary">₹3,300 per month</div>
                    <p className="text-sm text-muted-foreground">Personal seat with locker included</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}


          {step === 2 && selectedCategory === 'floating' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Floating Seat Details</h3>
              <div className="max-w-lg mx-auto">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="text-2xl font-bold text-primary">₹2,200 per month</div>
                    <div className="space-y-3 text-sm">
                      <p className="text-blue-800 font-medium">
                        🎉 Any available seat will be provided for 24×7 access from today's date!
                      </p>
                      <p className="text-blue-700">
                        Simply arrive at the library and choose from any available seat on a first-come, first-served basis.
                      </p>
                      <p className="text-blue-700">
                        No personal locker included with floating seat membership.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Duration Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Select Duration</h3>
              <div className="max-w-2xl mx-auto">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <Button
                      key={month}
                      variant={duration === month ? "default" : "outline"}
                      className={cn(
                        "h-16 text-lg transition-all",
                        duration === month && "ring-2 ring-primary/20 scale-105"
                      )}
                      onClick={() => setDuration(month)}
                    >
                      {month} Month{month > 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}


{/* Step 4: Order Summary */}
{step === 4 && (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-center">Order Summary</h3>
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calculate membership start and end dates */}
          {(() => {
            let startDate: Date;
            let endDate: Date;

            if (selectedCategory === 'fixed' && seatAvailability?.next_available_date) {
              startDate = new Date(seatAvailability.next_available_date);
            } else {
              startDate = new Date(); // fallback for floating
            }

            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + duration);

            return (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Seat Type:</span>
                    <Badge variant="default" className="capitalize">
                      {selectedCategory} Seat
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Seat Number:</span>
                    <span className="font-bold">
                      {selectedCategory === 'fixed' ? `Seat ${selectedSeat}` : 'Any Available Seat'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Cost per Month:</span>
                    <span className="font-bold text-primary">₹{calculateMonthlyCost().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Duration:</span>
                    <span className="font-bold">{duration} Month{duration > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Membership Duration:</span>
                    <span className="font-bold">
                      {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {" "}to{" "}
                      {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-bold">Total Cost:</span>
                    <span className="font-bold text-primary text-2xl">₹{calculateTotalCost().toLocaleString()}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  </div>
)}

          {step === 5 && (
            <div className="space-y-6 text-center">
              <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
              <h3 className="text-2xl font-bold text-green-700">Your request has been submitted successfully!</h3>
              <p className="text-base text-muted-foreground mt-2">
                Please complete the UPI payment to <span className="font-mono font-bold" id="upi-number">9899366722</span> (Receiver Name: Gurpreet Kaur).<br />
                Once the payment is made, the receipt will be updated in your profile within 15 minutes.<br /><br />
                Thank you!
              </p>
              <div className="flex justify-center mt-4">
              <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText('9899366722');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000); // revert icon after 2 sec
                  }}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  Copy UPI Number
                </Button>
              </div>    
            </div>
          )}


          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={step === 1 || step === 5}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={step === 5 && isLoading}>
                {step === 5 ? 'Close' : 'Cancel'}
              </Button>
              {step < 4 ? (
                <Button 
                  onClick={nextStep} 
                  disabled={
                    (step === 1 && !selectedCategory) ||
                    (step === 2 && selectedCategory === 'fixed' && (!selectedSeat || (seatAvailability && !seatAvailability.is_available))) ||
                    isLoading
                  }
                  className="flex items-center gap-2"
                >
                  {isLoading ? 'Checking...' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : step === 4 ? (
                <Button onClick={handleBooking} disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
