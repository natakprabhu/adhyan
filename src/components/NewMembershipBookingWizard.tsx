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
  //const [selectedCategory, setSelectedCategory] = useState<'fixed' | 'floating' | 'limited' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
  'fixed' | 'floating' | 'limited' | 'limited6' | null
  >(null);

  const [selectedShift, setSelectedShift] = useState<
    'morning' | 'afternoon' | 'evening' | 'night' | null
  >(null);

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // New for Limited Hours
  //const [selectedShift, setSelectedShift] = useState<'morning' | 'evening' | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedSeat(null);
      setDuration(1);
      setSeatAvailability(null);
      setSelectedShift(null);
    }
  }, [isOpen]);

  // const calculateMonthlyCost = () => {
  //   if (selectedCategory === 'fixed') return 3500;
  //   if (selectedCategory === 'floating') return 2200;
  //   if (selectedCategory === 'limited') return 1200; // user provided price
  //   return 0;
  // };

  const calculateMonthlyCost = () => {
    if (selectedCategory === 'fixed') return 4000;
    if (selectedCategory === 'floating') return 2800;
    if (selectedCategory === 'limited') return 1800;   // 9 hours
    if (selectedCategory === 'limited6') return 1200;   // ✅ NEW 6 hours
    return 0;
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

      // rpc expected to return array with one object
      setSeatAvailability(data && data[0] ? data[0] : null);
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

  // auto-check availability when seat changes (quality of life, doesn't remove old features)
  useEffect(() => {
    if (selectedCategory === 'fixed' && selectedSeat) {
      checkSeatAvailability(selectedSeat);
    } else {
      // reset availability when seat not applicable
      setSeatAvailability(null);
    }
    // note: we intentionally do not include `duration` here to avoid excessive RPC calls,
    // but if you want to re-check when duration changes, add `duration` to deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeat, selectedCategory]);

  const [copied, setCopied] = useState(false);

  const handleSeatSelection = async () => {
    if (!selectedSeat) return;
    await checkSeatAvailability(selectedSeat);
  };

  const handleBooking = async () => {
    if (!userProfile || !selectedCategory) return;



    // Old validation for limited shift
    // if (selectedCategory === 'limited' && !selectedShift) {
    //   toast({
    //     title: "Select Shift",
    //     description: "Please choose a shift for the Limited Hours membership.",
    //     variant: "destructive",
    //   });
    //   return;
    // }


    // ================= SLOT VALIDATION =================
    if (
      (selectedCategory === 'limited' || selectedCategory === 'limited6') &&
      !selectedShift
    ) {
      toast({
        title: "Select Slot",
        description: "Please choose a time slot",
        variant: "destructive",
      });
      return;
    }
    // ===================================================
    // validation for fixed seat availability
    if (selectedCategory === 'fixed' && selectedSeat && seatAvailability && !seatAvailability.is_available) {
      toast({
        title: "Seat Unavailable",
        description: "Selected seat is not available for the chosen duration.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the correct start date
      let startDate: Date;
      if (selectedCategory === 'fixed' && seatAvailability?.next_available_date) {
        startDate = new Date(seatAvailability.next_available_date);
      } else {
        startDate = new Date(); // fallback for floating and limited
      }

      // Calculate end date based on duration
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);

      let seatId = null;
      if (selectedCategory === 'fixed' && selectedSeat) {
        const { data: seatData, error: seatError } = await supabase
          .from('seats')
          .select('id')
          .eq('seat_number', selectedSeat)
          .single();
        if (seatError) throw seatError;
        seatId = seatData?.id;
      }

      const bookingData: any = {
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
        description: `${selectedCategory === 'fixed' ? 'Fixed' : selectedCategory === 'floating' ? 'Floating' : 'Limited Hours'} seat membership for ${duration} month${duration > 1 ? 's' : ''}`,
      };

      // OLD Limited Hours metadata
      // if (selectedCategory === 'limited') {
      //   bookingData.slot = selectedShift;     // required for 'limited'
        
      //   //bookingData.limited_hours = 9;        // optional but recommended
      // } else {
      //   // For fixed and floating: slot MUST be null (to satisfy bookings_slot_check)
      //   bookingData.slot = null;
      //   //bookingData.limited_hours = null;
      // }


      // ================= DB-SAFE SLOT & HOURS LOGIC =================
      if (selectedCategory === 'limited' || selectedCategory === 'limited6') {
        bookingData.slot = selectedShift; // 'morning' | 'afternoon' | 'evening' | 'night'

        bookingData.limited_hours =
          selectedCategory === 'limited' ? 9 : 6;
      } else {
        // IMPORTANT: must be NULL for fixed & floating
        bookingData.slot = null;
        bookingData.limited_hours = null;
      }
      // =============================================================


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
  // const nextStep = async () => {
  //   if (step === 1 && selectedCategory === "fixed") {
  //     setStep(2); // seat selection
  //   } else if (step === 1 && selectedCategory === "limited6") {
  //     setStep(2); // choose shift
  //   } else if (step === 2 && selectedCategory === "limited6") {
  //     setStep(3); // duration
  //   } else if (step === 1 && selectedCategory === "floating") {
  //     setStep(3); // jump to duration (floating skips seat selection)
  //   } else if (step === 1 && selectedCategory === "limited") {
  //     setStep(2); // choose shift
  //   } else if (step === 2 && selectedCategory === "fixed") {
  //     setStep(3); // seat selected -> duration
  //   } else if (step === 2 && selectedCategory === "limited") {
  //     setStep(3); // shift selected -> duration
  //   } else if (step === 3) {
  //     setStep(4); // duration -> summary
  //   } else if (step === 4) {
  //     setStep(5); // submit / success
  //   }
  // };

  const nextStep = async () => {
    if (step === 1) {
      if (selectedCategory === "fixed") {
        setStep(2); // seat selection
        return;
      }

      if (selectedCategory === "floating") {
        setStep(3); // skip seat
        return;
      }

      if (selectedCategory === "limited" || selectedCategory === "limited6") {
        setStep(2); // shift selection
        return;
      }
    }

    if (step === 2) {
      if (
        selectedCategory === "fixed" ||
        selectedCategory === "limited" ||
        selectedCategory === "limited6"
      ) {
        setStep(3); // duration
        return;
      }
    }

    if (step === 3) {
      setStep(4); // summary
      return;
    }

    if (step === 4) {
      setStep(5); // success
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

  // Build seatStatus showing next available date if occupied
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

  // Calculate membership duration based on seat availability (used in summary)
  let summaryStartDate: Date;
  let summaryEndDate: Date;

  if (seatAvailability?.next_available_date) {
    summaryStartDate = new Date(seatAvailability.next_available_date);
  } else {
    summaryStartDate = new Date(); // fallback if no availability info
  }

  summaryEndDate = new Date(summaryStartDate);
  summaryEndDate.setMonth(summaryEndDate.getMonth() + duration);

  // Steps total (floating has 4, others use 5)
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
                  (selectedCategory === 'floating' && i === 3) && "hidden" // keep previous hide behavior
                )}
              >
                {i}
              </div>
            ))}
          </div>

          {/* Step 1: Category Selection */}
{step === 1 && (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-center">
      Choose Your Membership
    </h3>

    {/* GRID FIX: 4 cards in one row on desktop */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* ================= FIXED SEAT ================= */}
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all hover:shadow-md h-full min-h-[320px]",
          selectedCategory === 'fixed'
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border hover:border-primary/50"
        )}
        onClick={() => {
          setSelectedCategory('fixed');
          setSelectedShift(null);
        }}
      >
        <CardHeader className="text-center pb-2">
          <Crown className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-lg">Fixed Seat</CardTitle>
          <CardDescription className="text-xs">
            Dedicated personal seat
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pt-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">₹4,000</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">Dedicated seat</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">Personal locker</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">24×7 access</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= FLOATING SEAT ================= */}
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all hover:shadow-md h-full min-h-[320px]",
          selectedCategory === 'floating'
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border hover:border-primary/50"
        )}
        onClick={() => {
          setSelectedCategory('floating');
          setSelectedShift(null);
        }}
      >
        <CardHeader className="text-center pb-2">
          <Users className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-lg">Floating Seat</CardTitle>
          <CardDescription className="text-xs">
            Any available seat
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pt-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">₹2,800</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">Any seat (1–50)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs">24×7 access</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">No locker</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= LIMITED 9 HOURS ================= */}
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all hover:shadow-md h-full min-h-[320px]",
          selectedCategory === 'limited'
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border hover:border-primary/50"
        )}
        onClick={() => {
          setSelectedCategory('limited');
          setSelectedSeat(null);
        }}
      >
        <CardHeader className="text-center pb-2">
          <Clock className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-lg">9 Hours</CardTitle>
          <CardDescription className="text-xs">
            Morning or Evening
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pt-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">₹1,800</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>

          <div className="space-y-1 text-xs">
            <div>🌅 6 AM – 3 PM</div>
            <div>🌆 3 PM – 12 AM</div>
            <div className="text-yellow-600">No locker</div>
          </div>
        </CardContent>
      </Card>

      {/* ================= LIMITED 6 HOURS ================= */}
      <Card
        className={cn(
          "cursor-pointer border-2 transition-all hover:shadow-md h-full min-h-[320px]",
          selectedCategory === 'limited6'
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border hover:border-primary/50"
        )}
        onClick={() => {
          setSelectedCategory('limited6');
          setSelectedSeat(null);
          setSelectedShift(null);
        }}
      >
        <CardHeader className="text-center pb-2">
          <Clock className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-lg">6 Hours</CardTitle>
          <CardDescription className="text-xs">
            Short flexible slots
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pt-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">₹1,200</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>

          <div className="space-y-1 text-xs">
            <div>🌅 6 AM – 12 PM</div>
            <div>🌤 12 PM – 6 PM</div>
            <div>🌆 6 PM – 12 AM</div>
            <div>🌙 12 AM – 6 AM</div>
          </div>
        </CardContent>
      </Card>

    </div>
  </div>
)}

          {/* Step 2: Seat Selection for Fixed OR Note for Floating OR Shift selection for Limited */}
          {step === 2 && selectedCategory === 'fixed' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Select Your Seat Number</h3>
              <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="seat" className="text-base font-semibold">Seat Number (1-50)</Label>
                  <select
                    id="seat"
                    value={selectedSeat || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSelectedSeat(Number.isNaN(val) ? null : val);
                    }}
                    className="text-center text-lg h-12 w-full border rounded-md px-2"
                  >
                    <option value="">Select Seat</option>
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
                      <div className="text-2xl font-bold text-primary">₹4,000 per month</div>
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
                    <div className="text-2xl font-bold text-primary">₹2,800 per month</div>
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

          {step === 2 && selectedCategory === 'limited' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Choose Your Shift</h3>
              <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className={cn(
                    "cursor-pointer border-2 p-4",
                    selectedShift === 'morning' ? "border-primary bg-primary/10" : "border-muted"
                  )}
                  onClick={() => setSelectedShift('morning')}
                >
                  <CardTitle className="text-center font-bold">Morning Shift</CardTitle>
                  <CardDescription className="text-center">6 AM – 3 PM</CardDescription>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer border-2 p-4",
                    selectedShift === 'evening' ? "border-primary bg-primary/10" : "border-muted"
                  )}
                  onClick={() => setSelectedShift('evening')}
                >
                  <CardTitle className="text-center font-bold">Evening Shift</CardTitle>
                  <CardDescription className="text-center">3 PM – 12 AM</CardDescription>
                </Card>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-primary">₹1,800 per month</p>
                <p className="text-sm text-muted-foreground">Access limited to selected shift only (9 hours / day)</p>
              </div>
            </div>
          )}

          {step === 2 && (selectedCategory === 'limited6') && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Choose Your Shift</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'morning', label: 'Morning', time: '6 AM – 12 PM'},
                    { id: 'afternoon', label: 'Afternoon', time: '12 PM – 6 PM' },
                    { id: 'evening', label: 'Evening', time: '6 PM – 12 AM' },
                    { id: 'night', label: 'Night', time: '12 AM – 6 AM' },
                  ].map(s => (
                    <Card
                      key={s.id}
                      onClick={() => setSelectedShift(s.id as any)}
                      className={cn(
                        "cursor-pointer border-2 p-4 text-center",
                        selectedShift === s.id ? "border-primary bg-primary/10" : "border-muted"
                      )}
                    >
                      <CardTitle>{s.label}</CardTitle>
                      <CardDescription>{s.time}</CardDescription>
                    </Card>
                  ))}
                </div>
{/*

              <div className="text-center">
                <p className="text-lg font-semibold text-primary">₹1,200 per month</p>
                <p className="text-sm text-muted-foreground">Access limited to selected shift only (9 hours / day)</p>
              </div>*/}
            </div>)}

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
                    {(() => {
                      let startDate: Date;
                      let endDate: Date;

                      if (selectedCategory === 'fixed' && seatAvailability?.next_available_date) {
                        startDate = new Date(seatAvailability.next_available_date);
                      } else {
                        startDate = new Date(); // fallback for floating and limited
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
{/*
                            {selectedCategory === 'limited' && (
                              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <span className="font-medium">Shift:</span>
                                <span className="font-bold capitalize">{selectedShift ? `${selectedShift} Shift` : 'Not selected'}</span>
                              </div>
                            )}
*/}
                            {(selectedCategory === 'limited' || selectedCategory === 'limited6') && (
                              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <span className="font-medium">Access:</span>
                                <span className="font-bold">
                                  {selectedCategory === 'limited'
                                    ? '9 Hours / Day'
                                    : '6 Hours / Day'}
                                </span>
                              </div>
                            )}


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

          {/* Step 5: Success */}
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
                    // fixed seat must have seat selected and available
                    (step === 2 && selectedCategory === 'fixed' && (!selectedSeat || (seatAvailability && !seatAvailability.is_available))) ||
                    // limited must have shift
                    // (step === 2 && selectedCategory === 'limited' && !selectedShift) ||
                    // isLoading
                    (step === 2 && (selectedCategory === 'limited' || selectedCategory === 'limited6') && !selectedShift)

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
