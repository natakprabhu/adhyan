import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Users, MapPin, Clock, IndianRupee, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipBookingWizardProps {
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

export default function MembershipBookingWizard({
  isOpen,
  onClose,
  onBookingComplete,
  userProfile,
}: MembershipBookingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<'fixed' | 'floating' | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedSeat(null);
      setDuration(1);
      setStartDate(new Date());
      setSeatAvailability(null);
    }
  }, [isOpen]);

  const calculateTotalCost = () => {
    const monthlyCost = selectedCategory === 'fixed' ? 3300 : 2200;
    return monthlyCost * duration;
  };

  const checkSeatAvailability = async (seatNumber: number) => {
    setIsLoading(true);
    try {
      const endDate = new Date(startDate);
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

  const handleSeatSelection = async () => {
    if (!selectedSeat) return;
    await checkSeatAvailability(selectedSeat);
  };

  const handleBooking = async () => {
    if (!userProfile || !selectedCategory) return;

    setIsLoading(true);
    try {
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
        monthly_cost: selectedCategory === 'fixed' ? 3300 : 2200,
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

      toast({
        title: "Booking Request Submitted",
        description: "Your membership request has been submitted for admin approval.",
      });

      onBookingComplete();
      onClose();
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

  const nextStep = () => {
    if (step === 1 && selectedCategory) {
      setStep(2);
    } else if (step === 2 && selectedCategory === 'floating') {
      setStep(4); // Skip seat selection for floating
    } else if (step === 2 && selectedCategory === 'fixed') {
      setStep(3);
    } else if (step === 3 && selectedSeat) {
      handleSeatSelection();
      setStep(4);
    }
  };

  const prevStep = () => {
    if (step === 4 && selectedCategory === 'floating') {
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Membership Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4].map((i) => (
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
                    "cursor-pointer transition-all hover:shadow-lg border-2",
                    selectedCategory === 'fixed' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedCategory('fixed')}
                >
                  <CardHeader className="text-center">
                    <Crown className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <CardTitle className="text-xl">Fixed Seat</CardTitle>
                    <CardDescription>Premium membership with dedicated seat</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">₹3,300</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Dedicated seat number</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Personal locker included</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>24×7 access</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg border-2",
                    selectedCategory === 'floating' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedCategory('floating')}
                >
                  <CardHeader className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <CardTitle className="text-xl">Floating Seat</CardTitle>
                    <CardDescription>Flexible membership with any available seat</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">₹2,200</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Any available seat</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>24×7 access</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span>No personal locker</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Duration and Start Date */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Membership Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="duration">Duration (Months)</Label>
                  <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {month} Month{month > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Start Date</Label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Cost:</span>
                    <span className="text-2xl font-bold text-primary">₹{calculateTotalCost().toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Seat Selection (Fixed only) */}
          {step === 3 && selectedCategory === 'fixed' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Select Your Seat</h3>
              <div className="space-y-3">
                <Label htmlFor="seat">Seat Number (1-50)</Label>
                <Input
                  id="seat"
                  type="number"
                  min="1"
                  max="50"
                  value={selectedSeat || ''}
                  onChange={(e) => setSelectedSeat(parseInt(e.target.value) || null)}
                  placeholder="Enter seat number"
                />
              </div>
              
              {seatAvailability && !seatAvailability.is_available && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Seat Not Available</p>
                        <p className="text-sm text-yellow-700">
                          This seat is occupied until {seatAvailability.conflicting_booking_end}. 
                          Next available from: {seatAvailability.next_available_date}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            if (seatAvailability.next_available_date) {
                              setStartDate(new Date(seatAvailability.next_available_date));
                              setSeatAvailability(null);
                            }
                          }}
                        >
                          Use Next Available Date
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Booking Summary</h3>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Membership Type</Label>
                      <p className="font-medium capitalize">{selectedCategory} Seat</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Seat Number</Label>
                      <p className="font-medium">
                        {selectedCategory === 'fixed' ? `Seat ${selectedSeat}` : 'Any Available Seat'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Duration</Label>
                      <p className="font-medium">{duration} Month{duration > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Start Date</Label>
                      <p className="font-medium">{startDate.toDateString()}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium">Total Amount:</span>
                      <span className="font-bold text-primary">₹{calculateTotalCost().toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedCategory === 'floating' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        🎉 Your floating seat membership will provide you with 24×7 access to any available seat in our facility. 
                        Simply arrive and choose from the available seats on a first-come, first-served basis.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step < 4 ? (
                <Button 
                  onClick={nextStep} 
                  disabled={
                    (step === 1 && !selectedCategory) ||
                    (step === 3 && (!selectedSeat || (seatAvailability && !seatAvailability.is_available))) ||
                    isLoading
                  }
                >
                  {isLoading ? 'Checking...' : 'Next'}
                </Button>
              ) : (
                <Button onClick={handleBooking} disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}