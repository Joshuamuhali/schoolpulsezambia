import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, GraduationCap, DollarSign, UserPlus, School } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

export function Step7Review() {
  const { data, nextStep } = useSetupWizard();

  const handleComplete = () => {
    nextStep(); // This will trigger the completion state
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Review & Complete
          </CardTitle>
          <CardDescription>
            Review your school setup before completing
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* School Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <School className="h-4 w-4" />
                School Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">School Name</p>
                  <p className="font-medium">{data.schoolName || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact Email</p>
                  <p className="font-medium">{data.contactEmail || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact Phone</p>
                  <p className="font-medium">{data.contactPhone || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{data.address || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grades & Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Grades & Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.grades && data.grades.length > 0 ? (
                <div className="space-y-3">
                  {data.grades.map((grade: any) => (
                    <div key={grade.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{grade.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {grade.classes.length} class{grade.classes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="outline">Level {grade.level}</Badge>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total: {data.grades.length} grade{data.grades.length !== 1 ? 's' : ''} •{' '}
                      {data.grades.reduce((acc: number, g: any) => acc + g.classes.length, 0)} classes
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No grades configured</p>
              )}
            </CardContent>
          </Card>

          {/* Fee Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.feeTypes && data.feeTypes.length > 0 ? (
                <div className="space-y-2">
                  {data.feeTypes.map((fee: any) => (
                    <div key={fee.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{fee.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{fee.frequency}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">ZK {fee.amount.toFixed(2)}</p>
                        {fee.isMandatory && (
                          <Badge variant="outline" className="text-xs">Mandatory</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fee types configured</p>
              )}
            </CardContent>
          </Card>

          {/* Staff Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.staffTypes && data.staffTypes.length > 0 ? (
                <div className="space-y-2">
                  {data.staffTypes.map((type: any) => (
                    <div key={type.id} className="flex items-center justify-between">
                      <p className="font-medium text-sm">{type.name}</p>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">ZK {type.baseSalary.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{type.payFrequency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No staff types configured</p>
              )}
            </CardContent>
          </Card>

          {/* Staff Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Staff Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.staff && data.staff.length > 0 ? (
                <div className="space-y-2">
                  {data.staff.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {member.firstName} {member.lastName}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                      {member.salary && (
                        <p className="text-sm font-medium text-primary">
                          ZK {member.salary.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No staff members added</p>
              )}
            </CardContent>
          </Card>

          {/* Pupils */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Pupils
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.pupils && data.pupils.length > 0 ? (
                <div>
                  <p className="text-2xl font-bold text-primary">{data.pupils.length}</p>
                  <p className="text-sm text-muted-foreground">
                    Pupil{data.pupils.length !== 1 ? 's' : ''} enrolled
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pupils enrolled yet</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button onClick={handleComplete} size="lg">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Complete Setup
        </Button>
      </div>
    </div>
  );
}