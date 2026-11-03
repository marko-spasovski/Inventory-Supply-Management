using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fleet_service.Migrations
{
    /// <inheritdoc />
    public partial class Update : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Vehicles",
                table: "Vehicles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Drivers",
                table: "Drivers");

            migrationBuilder.RenameTable(
                name: "Vehicles",
                newName: "vehicles");

            migrationBuilder.RenameTable(
                name: "Drivers",
                newName: "drivers");

            migrationBuilder.RenameColumn(
                name: "RegistrationPlate",
                table: "vehicles",
                newName: "registration_plate");

            migrationBuilder.RenameColumn(
                name: "CompanyId",
                table: "vehicles",
                newName: "company_id");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "drivers",
                newName: "phone");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "drivers",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "VehicleId",
                table: "drivers",
                newName: "vehicle_id");

            migrationBuilder.RenameColumn(
                name: "CompanyId",
                table: "drivers",
                newName: "company_id");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "drivers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_vehicles",
                table: "vehicles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_drivers",
                table: "drivers",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_vehicles",
                table: "vehicles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_drivers",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "email",
                table: "drivers");

            migrationBuilder.RenameTable(
                name: "vehicles",
                newName: "Vehicles");

            migrationBuilder.RenameTable(
                name: "drivers",
                newName: "Drivers");

            migrationBuilder.RenameColumn(
                name: "registration_plate",
                table: "Vehicles",
                newName: "RegistrationPlate");

            migrationBuilder.RenameColumn(
                name: "company_id",
                table: "Vehicles",
                newName: "CompanyId");

            migrationBuilder.RenameColumn(
                name: "phone",
                table: "Drivers",
                newName: "Phone");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "Drivers",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "vehicle_id",
                table: "Drivers",
                newName: "VehicleId");

            migrationBuilder.RenameColumn(
                name: "company_id",
                table: "Drivers",
                newName: "CompanyId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Vehicles",
                table: "Vehicles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Drivers",
                table: "Drivers",
                column: "Id");
        }
    }
}
